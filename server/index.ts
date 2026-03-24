/**
 * DropIt Signaling Server
 *
 * Lightweight WebSocket server that relays WebRTC signaling messages
 * (SDP offers/answers, ICE candidates) between peers.
 *
 * Discovery modes:
 *   1. IP-based auto-rooms — peers from the same public IP auto-discover
 *   2. Named rooms — join via a short room code for cross-network pairing
 *
 * Also serves a tiny HTTP API for room management.
 */

import { createServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";

// --- Name Generation ---
const adjectives = [
  "Orange", "Crimson", "Azure", "Golden", "Emerald", "Silver", "Violet",
  "Coral", "Amber", "Cobalt", "Scarlet", "Jade", "Copper", "Ivory", "Onyx",
];
const animals = [
  "Falcon", "Panther", "Wolf", "Phoenix", "Hawk", "Otter", "Lynx",
  "Viper", "Eagle", "Bear", "Fox", "Raven", "Tiger", "Crane", "Shark",
];

function generateName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj} ${animal}`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function generateRoomCode(): string {
  const word = animals[Math.floor(Math.random() * animals.length)].toUpperCase();
  const num = Math.floor(Math.random() * 900 + 100); // 100-999
  return `${word}-${num}`;
}

// --- Types ---
interface Peer {
  id: string;
  name: string;
  deviceType: string;
  ws: WebSocket;
  roomId: string;
  ip: string;
}

type SignalMessage =
  | { type: "join"; roomId?: string; deviceType?: string; name?: string }
  | { type: "offer"; targetId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; targetId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; targetId: string; candidate: RTCIceCandidateInit }
  | { type: "leave" };

// --- State ---
const rooms = new Map<string, Map<string, Peer>>();
const peersByWs = new WeakMap<WebSocket, Peer>();
// Track IP → auto-room mapping so same-network devices share a room
const ipRooms = new Map<string, string>();

// --- Helpers ---
function send(ws: WebSocket, data: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(roomId: string, senderId: string, data: Record<string, unknown>) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [id, peer] of room) {
    if (id !== senderId) {
      send(peer.ws, data);
    }
  }
}

function removePeer(ws: WebSocket) {
  const peer = peersByWs.get(ws);
  if (!peer) return;

  const room = rooms.get(peer.roomId);
  if (room) {
    room.delete(peer.id);
    broadcast(peer.roomId, peer.id, {
      type: "peer-left",
      peerId: peer.id,
      name: peer.name,
    });
    if (room.size === 0) {
      rooms.delete(peer.roomId);
      // Clean up IP→room mapping if this was an auto-room
      for (const [ip, rid] of ipRooms) {
        if (rid === peer.roomId) {
          ipRooms.delete(ip);
          break;
        }
      }
    }
  }
  peersByWs.delete(ws);
}

function getClientIp(req: IncomingMessage): string {
  // Support reverse proxies (Railway, Render, etc.)
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function getAutoRoomId(ip: string): string {
  // Reuse existing auto-room for this IP, or create one
  if (ipRooms.has(ip)) {
    return ipRooms.get(ip)!;
  }
  const roomId = `auto_${generateId()}`;
  ipRooms.set(ip, roomId);
  return roomId;
}

// --- HTTP + WebSocket Server ---
const PORT = parseInt(process.env.PORT || "3001", 10);

const httpServer = createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      rooms: rooms.size,
      peers: Array.from(rooms.values()).reduce((sum, r) => sum + r.size, 0),
    }));
    return;
  }

  // Create a named room and return the code
  if (url.pathname === "/api/room" && req.method === "POST") {
    const code = generateRoomCode();
    rooms.set(code, new Map());
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ roomCode: code }));
    return;
  }

  // Get room info
  if (url.pathname === "/api/room" && req.method === "GET") {
    const code = url.searchParams.get("code");
    if (code) {
      const room = rooms.get(code);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        exists: !!room,
        peers: room ? room.size : 0,
      }));
      return;
    }
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing ?code= parameter" }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const clientIp = getClientIp(req);

  ws.on("message", (raw: Buffer) => {
    let msg: SignalMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case "join": {
        removePeer(ws);

        // Determine room: explicit room code, or auto-room by IP
        let roomId: string;
        if (msg.roomId && msg.roomId !== "auto") {
          // Explicit room code — use as-is
          roomId = msg.roomId;
        } else {
          // Auto-discover by IP
          roomId = getAutoRoomId(clientIp);
        }

        const peer: Peer = {
          id: generateId(),
          name: msg.name || generateName(),
          deviceType: msg.deviceType || "desktop",
          ws,
          roomId,
          ip: clientIp,
        };

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Map());
        }
        const room = rooms.get(roomId)!;

        const existingPeers = Array.from(room.values()).map((p) => ({
          id: p.id,
          name: p.name,
          deviceType: p.deviceType,
        }));

        room.set(peer.id, peer);
        peersByWs.set(ws, peer);

        send(ws, {
          type: "joined",
          peerId: peer.id,
          name: peer.name,
          roomId,
          peers: existingPeers,
        });

        broadcast(roomId, peer.id, {
          type: "peer-joined",
          peerId: peer.id,
          name: peer.name,
          deviceType: peer.deviceType,
        });

        console.log(`[+] ${peer.name} (${peer.id}) joined room "${roomId}" [ip: ${clientIp}] (${room.size} peers)`);
        break;
      }

      case "offer": {
        const sender = peersByWs.get(ws);
        if (!sender) return;
        const room = rooms.get(sender.roomId);
        const target = room?.get(msg.targetId);
        if (target) {
          send(target.ws, {
            type: "offer",
            senderId: sender.id,
            senderName: sender.name,
            sdp: msg.sdp,
          });
        }
        break;
      }

      case "answer": {
        const sender = peersByWs.get(ws);
        if (!sender) return;
        const room = rooms.get(sender.roomId);
        const target = room?.get(msg.targetId);
        if (target) {
          send(target.ws, {
            type: "answer",
            senderId: sender.id,
            sdp: msg.sdp,
          });
        }
        break;
      }

      case "ice-candidate": {
        const sender = peersByWs.get(ws);
        if (!sender) return;
        const room = rooms.get(sender.roomId);
        const target = room?.get(msg.targetId);
        if (target) {
          send(target.ws, {
            type: "ice-candidate",
            senderId: sender.id,
            candidate: msg.candidate,
          });
        }
        break;
      }

      case "leave": {
        removePeer(ws);
        break;
      }
    }
  });

  ws.on("close", () => removePeer(ws));
  ws.on("error", () => removePeer(ws));
});

httpServer.listen(PORT, () => {
  console.log(`[DropIt Signal] HTTP + WS server on port ${PORT}`);
});

process.on("SIGINT", () => {
  console.log("\n[DropIt Signal] Shutting down...");
  wss.close();
  httpServer.close();
  process.exit(0);
});
