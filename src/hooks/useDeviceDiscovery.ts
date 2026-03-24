/**
 * useDeviceDiscovery Hook
 *
 * Connects to the signaling server on mount, maintains a live list
 * of discovered peers, and provides access to the PeerManager for
 * initiating data transfers.
 *
 * Room modes:
 *   - "auto" (default): server groups peers by IP (same WiFi auto-discovery)
 *   - Any string: explicit room code for cross-network pairing
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { PeerManager, type DiscoveredPeer } from "../services/peerManager";

const SIGNAL_URL = import.meta.env.VITE_SIGNAL_URL || "ws://localhost:3001";

// Derive the HTTP base URL from the WebSocket URL
function getHttpBaseUrl(): string {
  const url = new URL(SIGNAL_URL);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  return url.origin;
}

function detectDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|android.*mobile/.test(ua)) return "phone";
  if (/ipad|android(?!.*mobile)/.test(ua)) return "tablet";
  return "desktop";
}

export interface UseDeviceDiscoveryOptions {
  roomId?: string;
  deviceName?: string;
  autoConnect?: boolean;
}

export function useDeviceDiscovery(options: UseDeviceDiscoveryOptions = {}) {
  const { roomId = "auto", deviceName, autoConnect = true } = options;

  const [peers, setPeers] = useState<Map<string, DiscoveredPeer>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const managerRef = useRef<PeerManager | null>(null);

  const connect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
    }

    const manager = new PeerManager(SIGNAL_URL, {
      onPeersChanged: (newPeers) => {
        setPeers(newPeers);
      },
      onDataChannel: (peerId, channel) => {
        console.log(`[Discovery] Data channel ready with peer ${peerId}`);
        channel.onmessage = (event) => {
          console.log(`[Discovery] Message from ${peerId}:`, event.data);
        };
      },
      onConnectionStateChanged: (connected) => {
        setIsConnected(connected);
      },
      onJoined: (peerId, _name, joinedRoomId) => {
        setMyId(peerId);
        if (joinedRoomId) {
          setCurrentRoomId(joinedRoomId);
        }
      },
    });

    managerRef.current = manager;
    manager.connect(roomId, detectDeviceType(), deviceName);

    return undefined;
  }, [roomId, deviceName]);

  // Join a different room (for room code pairing)
  const joinRoom = useCallback((newRoomId: string) => {
    if (managerRef.current) {
      managerRef.current.disconnect();
    }
    const manager = new PeerManager(SIGNAL_URL, {
      onPeersChanged: (newPeers) => setPeers(newPeers),
      onDataChannel: (peerId, channel) => {
        console.log(`[Discovery] Data channel ready with peer ${peerId}`);
        channel.onmessage = (event) => {
          console.log(`[Discovery] Message from ${peerId}:`, event.data);
        };
      },
      onConnectionStateChanged: (connected) => setIsConnected(connected),
      onJoined: (peerId, _name, joinedRoomId) => {
        setMyId(peerId);
        if (joinedRoomId) setCurrentRoomId(joinedRoomId);
      },
    });
    managerRef.current = manager;
    manager.connect(newRoomId, detectDeviceType(), deviceName);
  }, [deviceName]);

  // Create a named room via the HTTP API
  const createRoom = useCallback(async (): Promise<string> => {
    const res = await fetch(`${getHttpBaseUrl()}/api/room`, { method: "POST" });
    const data = await res.json();
    return data.roomCode as string;
  }, []);

  useEffect(() => {
    if (!autoConnect) return;

    connect();

    return () => {
      managerRef.current?.disconnect();
      managerRef.current = null;
    };
  }, [autoConnect, connect]);

  const sendTestMessage = useCallback((peerId: string, message: string) => {
    const channel = managerRef.current?.getDataChannel(peerId);
    if (channel?.readyState === "open") {
      channel.send(message);
      console.log(`[Discovery] Sent to ${peerId}: ${message}`);
      return true;
    }
    console.warn(`[Discovery] No open channel to ${peerId}`);
    return false;
  }, []);

  return {
    peers,
    peerList: Array.from(peers.values()),
    isConnected,
    myId,
    currentRoomId,
    manager: managerRef.current,
    connect,
    joinRoom,
    createRoom,
    sendTestMessage,
    signalUrl: SIGNAL_URL,
  };
}
