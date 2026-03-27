/**
 * Signaling Client
 *
 * WebSocket connection to the signaling server.
 * Handles auto-reconnect with exponential backoff.
 * Event-based API for peer discovery and WebRTC signaling.
 */

export type SignalEventMap = {
  joined: {
    peerId: string;
    name: string;
    roomId: string;
    peers: Array<{ id: string; name: string; deviceType: string }>;
  };
  "peer-joined": { peerId: string; name: string; deviceType: string };
  "peer-left": { peerId: string; name: string };
  offer: {
    senderId: string;
    senderName: string;
    sdp: RTCSessionDescriptionInit;
  };
  answer: { senderId: string; sdp: RTCSessionDescriptionInit };
  "ice-candidate": { senderId: string; candidate: RTCIceCandidateInit };
  connected: undefined;
  disconnected: undefined;
};

type Listener<T> = (data: T) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners = new Map<string, Set<Listener<any>>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.intentionallyClosed = false;
    this.reconnectAttempts = 0;
    this.createConnection();
  }

  private createConnection() {
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit("connected", undefined);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type) {
          this.emit(msg.type as keyof SignalEventMap, msg);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.emit("disconnected", undefined);
      if (!this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("[Signal] Max reconnect attempts reached");
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    console.log(`[Signal] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this.createConnection(), delay);
  }

  send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  join(roomId: string, deviceType: string, name?: string, subnet?: string) {
    this.send({ type: "join", roomId, deviceType, name, subnet });
  }

  sendOffer(targetId: string, sdp: RTCSessionDescriptionInit) {
    this.send({ type: "offer", targetId, sdp });
  }

  sendAnswer(targetId: string, sdp: RTCSessionDescriptionInit) {
    this.send({ type: "answer", targetId, sdp });
  }

  sendIceCandidate(targetId: string, candidate: RTCIceCandidateInit) {
    this.send({ type: "ice-candidate", targetId, candidate });
  }

  on<K extends keyof SignalEventMap>(event: K, listener: Listener<SignalEventMap[K]>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof SignalEventMap>(event: K, listener: Listener<SignalEventMap[K]>) {
    this.listeners.get(event)?.delete(listener);
  }

  private emit<K extends keyof SignalEventMap>(event: K, data: SignalEventMap[K]) {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }

  disconnect() {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
