/**
 * WebRTC Service
 *
 * Manages RTCPeerConnection lifecycle, data channel creation,
 * and ICE/SDP exchange for a single peer connection.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
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
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private hasRemoteDescription = false;
  state: ConnectionState = "new";

  constructor(events: PeerConnectionEvents) {
    this.events = events;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.events.onIceCandidate(event.candidate);
      }
    };

    // Callee side: receives data channel from remote peer
    this.pc.ondatachannel = (event) => {
      console.log(`[WebRTC] Received remote data channel, state: ${event.channel.readyState}`);
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
      this.events.onDataChannel(this.dataChannel);
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      console.log(`[WebRTC] connectionState: ${state}`);
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

    // Fallback: some mobile browsers rely on iceConnectionState
    this.pc.oniceconnectionstatechange = () => {
      const iceState = this.pc.iceConnectionState;
      console.log(`[WebRTC] iceConnectionState: ${iceState}`);
      if (iceState === "connected" || iceState === "completed") {
        if (this.state !== "connected") {
          this.updateState("connected");
        }
      } else if (iceState === "failed") {
        this.updateState("failed");
      } else if (iceState === "disconnected") {
        this.updateState("disconnected");
      }
    };

    this.pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] iceGatheringState: ${this.pc.iceGatheringState}`);
    };
  }

  private updateState(state: ConnectionState) {
    if (this.state === state) return;
    this.state = state;
    this.events.onStateChange(state);
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = 256 * 1024;

    // Log channel state transitions
    const orig = channel.onopen;
    channel.onopen = (e) => {
      console.log(`[WebRTC] DataChannel "${channel.label}" opened`);
      if (orig) (orig as EventListener)(e!);
    };
  }

  /**
   * Create a data channel and generate an SDP offer (caller side).
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    this.dataChannel = this.pc.createDataChannel("dropit", {
      ordered: true,
    });
    this.setupDataChannel(this.dataChannel);

    console.log(`[WebRTC] Created local data channel, state: ${this.dataChannel.readyState}`);

    // Fire onDataChannel so PeerManager can track it and set onopen handler
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
    this.hasRemoteDescription = true;
    await this.flushPendingCandidates();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return this.pc.localDescription!.toJSON();
  }

  /**
   * Accept an SDP answer (caller side).
   */
  async handleAnswer(sdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    this.hasRemoteDescription = true;
    await this.flushPendingCandidates();
  }

  /**
   * Add a received ICE candidate. Buffers if remote description isn't set yet.
   */
  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.hasRemoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn("[WebRTC] Failed to add ICE candidate:", e);
    }
  }

  private async flushPendingCandidates() {
    const candidates = this.pendingCandidates.splice(0);
    for (const candidate of candidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("[WebRTC] Failed to add buffered ICE candidate:", e);
      }
    }
    if (candidates.length > 0) {
      console.log(`[WebRTC] Flushed ${candidates.length} buffered ICE candidates`);
    }
  }

  getDataChannel(): RTCDataChannel | null {
    return this.dataChannel;
  }

  close() {
    this.dataChannel?.close();
    this.pc.close();
    this.updateState("disconnected");
  }
}
