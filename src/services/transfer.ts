/**
 * Transfer Protocol
 *
 * Handles the full file transfer lifecycle over a WebRTC data channel:
 *   1. Sender sends a file-offer (metadata)
 *   2. Receiver accepts or rejects
 *   3. Sender streams 64KB chunks with backpressure management
 *   4. Receiver reassembles and verifies SHA-256 hash
 *   5. Both sides get progress callbacks
 */

import { readFileAsChunks, reassembleChunks, hashBlob, CHUNK_SIZE } from "./files";

// --- Message Types ---

interface FileOfferMessage {
  type: "file-offer";
  transferId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  hash?: string;
  bundleId?: string; // Present when part of a bundle
}

interface FileResponseMessage {
  type: "file-accept" | "file-reject";
  transferId: string;
}

interface BundleOfferMessage {
  type: "bundle-offer";
  bundleId: string;
  files: { fileName: string; fileSize: number; fileType: string }[];
  totalSize: number;
  totalFiles: number;
}

interface BundleResponseMessage {
  type: "bundle-accept" | "bundle-reject";
  bundleId: string;
}

interface ChunkMessage {
  type: "chunk";
  transferId: string;
  index: number;
  total: number;
}

interface TransferCompleteMessage {
  type: "transfer-complete";
  transferId: string;
  hash: string;
}

interface HashVerifyMessage {
  type: "hash-verify";
  transferId: string;
  valid: boolean;
}

export type TransferMessage =
  | FileOfferMessage
  | FileResponseMessage
  | BundleOfferMessage
  | BundleResponseMessage
  | ChunkMessage
  | TransferCompleteMessage
  | HashVerifyMessage;

// --- Transfer State ---

export type TransferStatus =
  | "pending"      // Offer sent, waiting for response
  | "accepted"     // Receiver accepted, about to stream
  | "rejected"     // Receiver rejected
  | "transferring" // Chunks are flowing
  | "verifying"    // Transfer done, verifying hash
  | "complete"     // Hash verified, done
  | "failed";      // Something went wrong

export interface TransferProgress {
  transferId: string;
  fileName: string;
  fileSize: number;
  status: TransferStatus;
  progress: number;         // 0-100
  bytesTransferred: number;
  speed: number;            // bytes/sec
  eta: number;              // seconds remaining
  direction: "send" | "receive";
  peerId: string;
  peerName: string;
  errorMessage?: string;    // Human-readable error for failed state
}

/** Human-readable error messages per PRD section 7.4 */
export function getTransferErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    "rejected": "Transfer was declined by the recipient.",
    "hash-mismatch": "File integrity check failed — the file may be corrupted. Try again.",
    "channel-closed": "Connection lost during transfer. Check your network and try again.",
    "timeout": "Transfer timed out. The other device may have gone offline.",
    "no-channel": "No connection to peer. Make sure both devices are on the same network.",
  };
  return messages[error] || `Transfer failed: ${error}`;
}

// --- Sender ---

export class FileSender {
  private channel: RTCDataChannel;
  private onProgress: (progress: TransferProgress) => void;
  private transferId: string;
  private startTime = 0;
  private bytesSent = 0;

  constructor(
    channel: RTCDataChannel,
    onProgress: (progress: TransferProgress) => void
  ) {
    this.channel = channel;
    this.onProgress = onProgress;
    this.transferId = crypto.randomUUID();
  }

  /**
   * Send a file to the connected peer. Returns a promise that resolves
   * when the transfer is complete (or rejects on failure/rejection).
   */
  async send(file: File, peerId: string, peerName: string, bundleId?: string): Promise<boolean> {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const makeProgress = (
      status: TransferStatus,
      progress: number,
      errorMessage?: string
    ): TransferProgress => ({
      transferId: this.transferId,
      fileName: file.name,
      fileSize: file.size,
      status,
      progress,
      bytesTransferred: this.bytesSent,
      speed: this.getSpeed(),
      eta: this.getEta(file.size),
      direction: "send",
      peerId,
      peerName,
      errorMessage,
    });

    try {
      // Step 1: Send file offer
      const offer: FileOfferMessage = {
        type: "file-offer",
        transferId: this.transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks,
        bundleId,
      };
      this.sendJson(offer);
      this.onProgress(makeProgress("pending", 0));

      // Step 2: Wait for accept/reject
      const accepted = await this.waitForResponse();
      if (!accepted) {
        this.onProgress(makeProgress("rejected", 0, getTransferErrorMessage("rejected")));
        return false;
      }

      this.onProgress(makeProgress("accepted", 0));

      // Step 3: Stream chunks with backpressure
      this.startTime = Date.now();
      this.bytesSent = 0;

      for await (const { chunk, index, total } of readFileAsChunks(file)) {
        // Check channel state before sending
        if (this.channel.readyState !== "open") {
          this.onProgress(makeProgress("failed", Math.round((this.bytesSent / file.size) * 100), getTransferErrorMessage("channel-closed")));
          return false;
        }

        // Backpressure: wait if buffer is full
        await this.waitForBufferDrain();

        // Send chunk header as JSON
        const header: ChunkMessage = {
          type: "chunk",
          transferId: this.transferId,
          index,
          total,
        };
        this.sendJson(header);

        // Send chunk data as binary
        this.channel.send(chunk);
        this.bytesSent += chunk.byteLength;

        const progress = Math.round(((index + 1) / total) * 100);
        this.onProgress(makeProgress("transferring", progress));
      }

      // Step 4: Compute hash and send completion
      this.onProgress(makeProgress("verifying", 100));
      const hash = await hashBlob(file);
      const complete: TransferCompleteMessage = {
        type: "transfer-complete",
        transferId: this.transferId,
        hash,
      };
      this.sendJson(complete);

      // Step 5: Wait for hash verification from receiver
      const valid = await this.waitForHashVerify();
      this.onProgress(makeProgress(
        valid ? "complete" : "failed",
        100,
        valid ? undefined : getTransferErrorMessage("hash-mismatch")
      ));
      return valid;
    } catch (err) {
      const message = err instanceof Error ? err.message : "channel-closed";
      this.onProgress(makeProgress("failed", Math.round((this.bytesSent / file.size) * 100), getTransferErrorMessage(message)));
      return false;
    }
  }

  get id() {
    return this.transferId;
  }

  private sendJson(data: TransferMessage) {
    this.channel.send(JSON.stringify(data));
  }

  private getSpeed(): number {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return elapsed > 0 ? this.bytesSent / elapsed : 0;
  }

  private getEta(totalSize: number): number {
    const speed = this.getSpeed();
    if (speed === 0) return 0;
    return (totalSize - this.bytesSent) / speed;
  }

  private waitForBufferDrain(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.channel.bufferedAmount < 1024 * 1024) { // 1MB threshold
          resolve();
        } else {
          // Use bufferedamountlow event if available, else poll
          if (this.channel.onbufferedamountlow !== undefined) {
            this.channel.onbufferedamountlow = () => {
              this.channel.onbufferedamountlow = null;
              resolve();
            };
          } else {
            setTimeout(check, 10);
          }
        }
      };
      check();
    });
  }

  private waitForResponse(): Promise<boolean> {
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        if (typeof event.data !== "string") return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.transferId !== this.transferId) return;
          if (msg.type === "file-accept") {
            this.channel.removeEventListener("message", handler);
            resolve(true);
          } else if (msg.type === "file-reject") {
            this.channel.removeEventListener("message", handler);
            resolve(false);
          }
        } catch { /* ignore non-JSON */ }
      };
      this.channel.addEventListener("message", handler);

      // Timeout after 60s — treat as rejection
      setTimeout(() => {
        this.channel.removeEventListener("message", handler);
        resolve(false);
      }, 60000);
    });
  }

  private waitForHashVerify(): Promise<boolean> {
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        if (typeof event.data !== "string") return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.transferId !== this.transferId) return;
          if (msg.type === "hash-verify") {
            this.channel.removeEventListener("message", handler);
            resolve(msg.valid);
          }
        } catch { /* ignore */ }
      };
      this.channel.addEventListener("message", handler);

      // Timeout after 30s — assume success if no response
      setTimeout(() => {
        this.channel.removeEventListener("message", handler);
        resolve(true);
      }, 30000);
    });
  }
}

// --- Receiver ---

export interface IncomingTransfer {
  transferId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  peerId: string;
  peerName: string;
  // Bundle info (present when this is a bundle offer)
  bundleId?: string;
  bundleFiles?: { fileName: string; fileSize: number; fileType: string }[];
  totalFiles?: number;
  totalSize?: number;
}

export type TransferDecision = (accept: boolean) => void;

export class FileReceiver {
  private channel: RTCDataChannel;
  private onProgress: (progress: TransferProgress) => void;
  private onIncomingOffer: (offer: IncomingTransfer, decide: TransferDecision) => void;
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  // Active receive state
  private chunks = new Map<string, ArrayBuffer[]>();
  private metadata = new Map<string, IncomingTransfer>();
  private expectingBinary = new Map<string, { index: number; total: number }>();
  private startTimes = new Map<string, number>();
  private bytesReceived = new Map<string, number>();

  // Bundle state — approved bundles auto-accept individual file-offers
  private approvedBundles = new Set<string>();

  constructor(
    channel: RTCDataChannel,
    peerId: string,
    peerName: string,
    onProgress: (progress: TransferProgress) => void,
    onIncomingOffer: (offer: IncomingTransfer, decide: TransferDecision) => void
  ) {
    this.channel = channel;
    this.onProgress = onProgress;
    this.onIncomingOffer = onIncomingOffer;

    this.messageHandler = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        this.handleJsonMessage(event.data, peerId, peerName);
      } else if (event.data instanceof ArrayBuffer) {
        this.handleBinaryMessage(event.data);
      }
    };
    this.channel.addEventListener("message", this.messageHandler);
  }

  private handleJsonMessage(raw: string, peerId: string, peerName: string) {
    let msg: TransferMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "bundle-offer":
        this.handleBundleOffer(msg as BundleOfferMessage, peerId, peerName);
        break;
      case "file-offer":
        this.handleOffer(msg, peerId, peerName);
        break;
      case "chunk":
        this.handleChunkHeader(msg);
        break;
      case "transfer-complete":
        this.handleComplete(msg, peerId, peerName);
        break;
    }
  }

  private handleBundleOffer(msg: BundleOfferMessage, peerId: string, peerName: string) {
    // Present the bundle as a single approval prompt
    const bundleOffer: IncomingTransfer = {
      transferId: msg.bundleId,
      fileName: msg.files.length === 2
        ? `${msg.files[0].fileName} and ${msg.files[1].fileName}`
        : `${msg.files[0].fileName} and ${msg.totalFiles - 1} other files`,
      fileSize: msg.totalSize,
      fileType: "bundle",
      totalChunks: 0,
      peerId,
      peerName,
      bundleId: msg.bundleId,
      bundleFiles: msg.files,
      totalFiles: msg.totalFiles,
      totalSize: msg.totalSize,
    };

    this.onIncomingOffer(bundleOffer, (accept: boolean) => {
      const response: BundleResponseMessage = {
        type: accept ? "bundle-accept" : "bundle-reject",
        bundleId: msg.bundleId,
      };
      this.channel.send(JSON.stringify(response));

      if (accept) {
        this.approvedBundles.add(msg.bundleId);
      }
    });
  }

  private handleOffer(msg: FileOfferMessage, peerId: string, peerName: string) {
    const offer: IncomingTransfer = {
      transferId: msg.transferId,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      fileType: msg.fileType,
      totalChunks: msg.totalChunks,
      peerId,
      peerName,
    };

    // If this file is part of an approved bundle, auto-accept
    if (msg.bundleId && this.approvedBundles.has(msg.bundleId)) {
      const response: FileResponseMessage = {
        type: "file-accept",
        transferId: msg.transferId,
      };
      this.channel.send(JSON.stringify(response));
      this.chunks.set(msg.transferId, []);
      this.metadata.set(msg.transferId, offer);
      this.startTimes.set(msg.transferId, Date.now());
      this.bytesReceived.set(msg.transferId, 0);
      return;
    }

    // Single file — show approval prompt as before
    this.onIncomingOffer(offer, (accept: boolean) => {
      const response: FileResponseMessage = {
        type: accept ? "file-accept" : "file-reject",
        transferId: msg.transferId,
      };
      this.channel.send(JSON.stringify(response));

      if (accept) {
        this.chunks.set(msg.transferId, []);
        this.metadata.set(msg.transferId, offer);
        this.startTimes.set(msg.transferId, Date.now());
        this.bytesReceived.set(msg.transferId, 0);
      }
    });
  }

  private handleChunkHeader(msg: ChunkMessage) {
    // Next binary message on this channel belongs to this transfer
    this.expectingBinary.set(msg.transferId, {
      index: msg.index,
      total: msg.total,
    });
  }

  private handleBinaryMessage(data: ArrayBuffer) {
    // Find which transfer this binary belongs to
    for (const [transferId, header] of this.expectingBinary) {
      const chunkList = this.chunks.get(transferId);
      const meta = this.metadata.get(transferId);
      if (!chunkList || !meta) continue;

      chunkList[header.index] = data;
      this.expectingBinary.delete(transferId);

      const received = (this.bytesReceived.get(transferId) || 0) + data.byteLength;
      this.bytesReceived.set(transferId, received);

      const elapsed = (Date.now() - (this.startTimes.get(transferId) || Date.now())) / 1000;
      const speed = elapsed > 0 ? received / elapsed : 0;
      const progress = Math.round(((header.index + 1) / header.total) * 100);

      this.onProgress({
        transferId,
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        status: "transferring",
        progress,
        bytesTransferred: received,
        speed,
        eta: speed > 0 ? (meta.fileSize - received) / speed : 0,
        direction: "receive",
        peerId: meta.peerId,
        peerName: meta.peerName,
      });
      break;
    }
  }

  private async handleComplete(msg: TransferCompleteMessage, peerId: string, peerName: string) {
    const chunkList = this.chunks.get(msg.transferId);
    const meta = this.metadata.get(msg.transferId);
    if (!chunkList || !meta) return;

    this.onProgress({
      transferId: msg.transferId,
      fileName: meta.fileName,
      fileSize: meta.fileSize,
      status: "verifying",
      progress: 100,
      bytesTransferred: meta.fileSize,
      speed: 0,
      eta: 0,
      direction: "receive",
      peerId,
      peerName,
    });

    // Reassemble and verify
    const blob = reassembleChunks(chunkList, meta.fileType);
    const localHash = await hashBlob(blob);
    const valid = localHash === msg.hash;

    // Send verification result
    const verify: HashVerifyMessage = {
      type: "hash-verify",
      transferId: msg.transferId,
      valid,
    };
    this.channel.send(JSON.stringify(verify));

    this.onProgress({
      transferId: msg.transferId,
      fileName: meta.fileName,
      fileSize: meta.fileSize,
      status: valid ? "complete" : "failed",
      progress: 100,
      bytesTransferred: meta.fileSize,
      speed: 0,
      eta: 0,
      direction: "receive",
      peerId,
      peerName,
      errorMessage: valid ? undefined : getTransferErrorMessage("hash-mismatch"),
    });

    if (valid) {
      // Return the blob for the caller to handle (download, etc.)
      this.onFileReceived?.(blob, meta.fileName);
    }

    // Cleanup
    this.chunks.delete(msg.transferId);
    this.metadata.delete(msg.transferId);
    this.startTimes.delete(msg.transferId);
    this.bytesReceived.delete(msg.transferId);
  }

  // Callback set externally for completed file delivery
  onFileReceived: ((blob: Blob, fileName: string) => void) | null = null;

  destroy() {
    if (this.messageHandler) {
      this.channel.removeEventListener("message", this.messageHandler);
      this.messageHandler = null;
    }
  }
}
