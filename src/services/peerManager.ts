/**
 * PeerManager
 *
 * Orchestrates SignalingClient + PeerConnection instances.
 * Manages the lifecycle of all peer connections in a room.
 * Provides a clean API for the UI layer to discover peers and send data.
 */

import { SignalingClient } from "./signaling";
import { PeerConnection, type ConnectionState } from "./webrtc";

export interface DiscoveredPeer {
  id: string;
  name: string;
  deviceType: string;
  connectionState: ConnectionState;
  dataChannel: RTCDataChannel | null;
}

type PeerManagerEvents = {
  onPeersChanged: (peers: Map<string, DiscoveredPeer>) => void;
  onDataChannel: (peerId: string, channel: RTCDataChannel) => void;
  onConnectionStateChanged: (connected: boolean) => void;
  onJoined?: (peerId: string, name: string, roomId?: string) => void;
};

export class PeerManager {
  private signaling: SignalingClient;
  private connections = new Map<string, PeerConnection>();
  private peers = new Map<string, DiscoveredPeer>();
  private events: PeerManagerEvents;
  private myId: string | null = null;
  private cleanupFns: Array<() => void> = [];
  private peerTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private retryCount = new Map<string, number>();
  private static STALE_PEER_TIMEOUT = 20_000; // 20 seconds
  private static MAX_RETRIES = 2;

  constructor(signalingUrl: string, events: PeerManagerEvents) {
    this.signaling = new SignalingClient(signalingUrl);
    this.events = events;
  }

  /**
   * Connect to signaling server and join a room.
   */
  connect(roomId: string = "default", deviceType: string = "desktop", name?: string, subnet?: string) {
    this.signaling.connect();

    // When connected to signaling, join the room
    this.cleanupFns.push(
      this.signaling.on("connected", () => {
        this.signaling.join(roomId, deviceType, name, subnet);
        this.events.onConnectionStateChanged(true);
      })
    );

    this.cleanupFns.push(
      this.signaling.on("disconnected", () => {
        this.events.onConnectionStateChanged(false);
      })
    );

    // Handle room join confirmation (fires on initial join AND reconnect)
    this.cleanupFns.push(
      this.signaling.on("joined", (data) => {
        // Clean up stale connections from previous session (reconnect scenario)
        if (this.connections.size > 0) {
          console.log(`[PeerManager] Re-join detected, cleaning up ${this.connections.size} stale connections`);
          for (const [, pc] of this.connections) {
            pc.close();
          }
          this.connections.clear();
          this.peers.clear();
          for (const [, timer] of this.peerTimers) {
            clearTimeout(timer);
          }
          this.peerTimers.clear();
        }

        this.myId = data.peerId;
        this.events.onJoined?.(data.peerId, data.name, data.roomId);
        console.log(`[PeerManager] Joined as "${data.name}" (${data.peerId}) in room "${data.roomId}" — ${data.peers.length} existing peer(s)`);

        // Register existing peers and initiate connections using ID-based caller logic
        for (const peer of data.peers) {
          this.addPeer(peer.id, peer.name, peer.deviceType);
          // Use ID comparison: higher ID = caller. This ensures exactly one side
          // creates the offer even if both peers process join events simultaneously.
          if (this.myId && this.myId > peer.id) {
            this.initiateConnection(peer.id);
          }
        }
      })
    );

    // Handle new peer joining
    this.cleanupFns.push(
      this.signaling.on("peer-joined", (data) => {
        console.log(`[PeerManager] Peer joined: "${data.name}" (${data.peerId})`);

        // If we already know this peer (reconnect scenario), tear down stale connection first
        if (this.peers.has(data.peerId) || this.connections.has(data.peerId)) {
          console.log(`[PeerManager] Peer "${data.name}" already known — cleaning up stale connection`);
          const oldPc = this.connections.get(data.peerId);
          if (oldPc) {
            oldPc.close();
            this.connections.delete(data.peerId);
          }
          this.clearStaleTimer(data.peerId);
          this.retryCount.delete(data.peerId);
        }

        this.addPeer(data.peerId, data.name, data.deviceType);

        // Both sides initiate connections now. Use ID comparison to determine
        // who creates the offer (higher ID = caller) to avoid duplicate offers.
        if (this.myId && this.myId > data.peerId) {
          console.log(`[PeerManager] Initiating connection to new peer "${data.name}" (we are caller)`);
          this.initiateConnection(data.peerId);
        }
      })
    );

    // Handle peer leaving
    this.cleanupFns.push(
      this.signaling.on("peer-left", (data) => {
        console.log(`[PeerManager] Peer left: "${data.name}" (${data.peerId})`);
        this.removePeer(data.peerId);
      })
    );

    // Handle incoming WebRTC offer
    this.cleanupFns.push(
      this.signaling.on("offer", async (data) => {
        console.log(`[PeerManager] Received offer from ${data.senderId}`);
        const pc = this.getOrCreateConnection(data.senderId);
        const answer = await pc.handleOffer(data.sdp);
        this.signaling.sendAnswer(data.senderId, answer);
      })
    );

    // Handle incoming WebRTC answer
    this.cleanupFns.push(
      this.signaling.on("answer", async (data) => {
        console.log(`[PeerManager] Received answer from ${data.senderId}`);
        const pc = this.connections.get(data.senderId);
        if (pc) {
          await pc.handleAnswer(data.sdp);
        }
      })
    );

    // Handle incoming ICE candidate
    this.cleanupFns.push(
      this.signaling.on("ice-candidate", async (data) => {
        const pc = this.connections.get(data.senderId);
        if (pc) {
          await pc.addIceCandidate(data.candidate);
        }
      })
    );
  }

  /**
   * Initiate a WebRTC connection to a specific peer (caller side).
   */
  private async initiateConnection(peerId: string) {
    const pc = this.getOrCreateConnection(peerId);
    const offer = await pc.createOffer();
    this.signaling.sendOffer(peerId, offer);
  }

  /**
   * Get or create a PeerConnection for a given peer.
   */
  private getOrCreateConnection(peerId: string): PeerConnection {
    if (this.connections.has(peerId)) {
      return this.connections.get(peerId)!;
    }

    const pc = new PeerConnection({
      onIceCandidate: (candidate) => {
        this.signaling.sendIceCandidate(peerId, candidate.toJSON());
      },
      onDataChannel: (channel) => {
        // Update peer's data channel reference
        const peer = this.peers.get(peerId);
        if (peer) {
          peer.dataChannel = channel;
          this.notifyPeersChanged();
        }
        this.events.onDataChannel(peerId, channel);

        channel.onopen = () => {
          console.log(`[PeerManager] Data channel open with ${peerId}`);
          this.updatePeerState(peerId, "connected");
        };

        channel.onclose = () => {
          console.log(`[PeerManager] Data channel closed with ${peerId}`);
          this.updatePeerState(peerId, "disconnected");
        };
      },
      onStateChange: (state) => {
        this.updatePeerState(peerId, state);
      },
    });

    this.connections.set(peerId, pc);
    return pc;
  }

  private addPeer(id: string, name: string, deviceType: string) {
    this.peers.set(id, {
      id,
      name,
      deviceType,
      connectionState: "new",
      dataChannel: null,
    });
    this.startStaleTimer(id);
    this.notifyPeersChanged();
  }

  private removePeer(id: string) {
    this.clearStaleTimer(id);
    this.retryCount.delete(id);
    this.peers.delete(id);
    const pc = this.connections.get(id);
    if (pc) {
      pc.close();
      this.connections.delete(id);
    }
    this.notifyPeersChanged();
  }

  private updatePeerState(peerId: string, state: ConnectionState) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connectionState = state;

      if (state === "connected") {
        this.clearStaleTimer(peerId);
        this.retryCount.delete(peerId);
      } else if (state === "failed") {
        this.clearStaleTimer(peerId);
        // Attempt retry before giving up
        const retries = this.retryCount.get(peerId) || 0;
        if (retries < PeerManager.MAX_RETRIES) {
          this.retryCount.set(peerId, retries + 1);
          console.log(`[PeerManager] Connection to "${peer.name}" failed, retrying (${retries + 1}/${PeerManager.MAX_RETRIES})...`);
          // Tear down old connection and retry after a brief delay
          const oldPc = this.connections.get(peerId);
          if (oldPc) {
            oldPc.close();
            this.connections.delete(peerId);
          }
          peer.connectionState = "connecting";
          this.notifyPeersChanged();
          setTimeout(() => {
            if (this.peers.has(peerId)) {
              this.initiateConnection(peerId);
              this.startStaleTimer(peerId);
            }
          }, 2000);
          return;
        }
        // Max retries exhausted — remove
        setTimeout(() => this.removePeer(peerId), 3000);
      } else if (state === "disconnected") {
        this.clearStaleTimer(peerId);
        // Grace period: transient disconnects recover on their own
        setTimeout(() => {
          const currentPeer = this.peers.get(peerId);
          if (currentPeer && currentPeer.connectionState === "disconnected") {
            // Still disconnected after grace — try to reconnect
            const retries = this.retryCount.get(peerId) || 0;
            if (retries < PeerManager.MAX_RETRIES) {
              this.retryCount.set(peerId, retries + 1);
              console.log(`[PeerManager] "${currentPeer.name}" still disconnected, retrying...`);
              const oldPc = this.connections.get(peerId);
              if (oldPc) {
                oldPc.close();
                this.connections.delete(peerId);
              }
              this.initiateConnection(peerId);
              this.startStaleTimer(peerId);
            } else {
              this.removePeer(peerId);
            }
          }
        }, 8000); // 8s grace for transient disconnects
      }
      this.notifyPeersChanged();
    }
  }

  private startStaleTimer(peerId: string) {
    this.clearStaleTimer(peerId);
    this.peerTimers.set(
      peerId,
      setTimeout(() => {
        const peer = this.peers.get(peerId);
        if (peer && peer.connectionState !== "connected") {
          console.log(`[PeerManager] Removing stale peer "${peer.name}" (stuck in ${peer.connectionState})`);
          this.removePeer(peerId);
        }
      }, PeerManager.STALE_PEER_TIMEOUT)
    );
  }

  private clearStaleTimer(peerId: string) {
    const timer = this.peerTimers.get(peerId);
    if (timer) {
      clearTimeout(timer);
      this.peerTimers.delete(peerId);
    }
  }

  private notifyPeersChanged() {
    this.events.onPeersChanged(new Map(this.peers));
  }

  /**
   * Get a peer's data channel for sending data.
   */
  getDataChannel(peerId: string): RTCDataChannel | null {
    return this.peers.get(peerId)?.dataChannel ?? null;
  }

  /**
   * Get all discovered peers.
   */
  getPeers(): Map<string, DiscoveredPeer> {
    return new Map(this.peers);
  }

  /**
   * Get our own peer ID.
   */
  getMyId(): string | null {
    return this.myId;
  }

  /**
   * Disconnect from everything.
   */
  disconnect() {
    for (const cleanup of this.cleanupFns) {
      cleanup();
    }
    this.cleanupFns = [];
    for (const [, timer] of this.peerTimers) {
      clearTimeout(timer);
    }
    this.peerTimers.clear();
    this.retryCount.clear();
    for (const [, pc] of this.connections) {
      pc.close();
    }
    this.connections.clear();
    this.peers.clear();
    this.signaling.disconnect();
    this.myId = null;
  }
}
