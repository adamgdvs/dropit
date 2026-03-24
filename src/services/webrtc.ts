/**
 * WebRTC Service
 *
 * Manages RTCPeerConnection lifecycle, data channel creation,
 * and ICE/SDP exchange for a single peer connection.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Free TURN relay for NAT traversal (phone ↔ desktop across networks)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export type ConnectionState = "new" | "connecting" | "connected" | "disconnected" | "failed";

export type PeerConnectionEvents = {
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onDataChannel: (channel: RTCDataChannel) => void;
  onStateChange: (state: ConnectionState) => void;
};

export class PeerConnection {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private events: PeerConnectionEvents;
  state: ConnectionState = "new";

  constructor(events: PeerConnectionEvents) {
    this.events = events;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.events.onIceCandidate(event.candidate);
      }
    };

    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
      this.events.onDataChannel(this.dataChannel);
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      switch (state) {
        case "connecting":
          this.updateState("connecting");
          break;
        case "connected":
          this.updateState("connected");
          break;
        case "disconnected":
        case "closed":
          this.updateState("disconnected");
          break;
        case "failed":
          this.updateState("failed");
          break;
      }
    };
  }

  private updateState(state: ConnectionState) {
    this.state = state;
    this.events.onStateChange(state);
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = 256 * 1024; // 256KB
  }

  /**
   * Create a data channel and generate an SDP offer (caller side).
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    this.dataChannel = this.pc.createDataChannel("dropit", {
      ordered: true,
    });
    this.setupDataChannel(this.dataChannel);
    this.events.onDataChannel(this.dataChannel);

    this.updateState("connecting");
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return this.pc.localDescription!.toJSON();
  }

  /**
   * Accept an SDP offer and return an answer (callee side).
   */
  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.updateState("connecting");
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return this.pc.localDescription!.toJSON();
  }

  /**
   * Accept an SDP answer (caller side).
   */
  async handleAnswer(sdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  /**
   * Add a received ICE candidate.
   */
  async addIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn("[WebRTC] Failed to add ICE candidate:", e);
    }
  }

  /**
   * Get the active data channel (if open).
   */
  getDataChannel(): RTCDataChannel | null {
    return this.dataChannel;
  }

  /**
   * Close the connection and clean up.
   */
  close() {
    this.dataChannel?.close();
    this.pc.close();
    this.updateState("disconnected");
  }
}
