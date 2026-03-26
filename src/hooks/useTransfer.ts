/**
 * useTransfer Hook
 *
 * Initializes PeerManager and syncs all state into Zustand stores.
 * Manages incoming offer queue and file send/receive orchestration.
 * Supports dynamic room switching for pairing.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { PeerManager } from "../services/peerManager";
import {
  FileSender,
  FileReceiver,
  type IncomingTransfer,
  type TransferDecision,
} from "../services/transfer";
import { downloadBlob } from "../services/files";
import { getDeviceName } from "../services/deviceIdentity";
import { useDeviceStore, type DeviceInfo } from "../stores/deviceStore";
import { useTransferStore } from "../stores/transferStore";
import { useFileStore } from "../stores/fileStore";

const SIGNAL_URL = import.meta.env.VITE_SIGNAL_URL || "ws://localhost:3001";

function detectDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|android.*mobile/.test(ua)) return "phone";
  if (/ipad|android(?!.*mobile)/.test(ua)) return "tablet";
  return "desktop";
}

export interface PendingOffer {
  offer: IncomingTransfer;
  decide: TransferDecision;
}

export function useTransfer(options: { roomId?: string; deviceName?: string } = {}) {
  const { roomId = "auto", deviceName = getDeviceName() } = options;

  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);
  const managerRef = useRef<PeerManager | null>(null);
  const receiversRef = useRef<Map<string, FileReceiver>>(new Map());

  // Use refs for store actions to avoid re-triggering the effect
  const setDevices = useDeviceStore((s) => s.setDevices);
  const setIdentity = useDeviceStore((s) => s.setIdentity);
  const setSignalingConnected = useDeviceStore((s) => s.setSignalingConnected);
  const updateTransfer = useTransferStore((s) => s.updateTransfer);
  const addReceived = useFileStore((s) => s.addReceived);

  const storeActionsRef = useRef({ setDevices, setIdentity, setSignalingConnected, updateTransfer, addReceived });
  storeActionsRef.current = { setDevices, setIdentity, setSignalingConnected, updateTransfer, addReceived };

  const pendingOfferRef = useRef(setPendingOffer);
  pendingOfferRef.current = setPendingOffer;

  // Connect on mount and when roomId changes — stable effect, no dependency churn
  useEffect(() => {
    console.log(`[Transfer] Connecting to room: "${roomId}"`);

    // Cleanup previous
    for (const [, receiver] of receiversRef.current) {
      receiver.destroy();
    }
    receiversRef.current.clear();
    managerRef.current?.disconnect();

    const setupReceiver = (peerId: string, channel: RTCDataChannel) => {
      const peerName = managerRef.current?.getPeers().get(peerId)?.name || "Unknown";

      receiversRef.current.get(peerId)?.destroy();

      const receiver = new FileReceiver(
        channel,
        peerId,
        peerName,
        (progress) => storeActionsRef.current.updateTransfer(progress),
        (offer, decide) => pendingOfferRef.current({ offer, decide })
      );

      receiver.onFileReceived = (blob, fileName) => {
        console.log(`[Transfer] File received: ${fileName} (${blob.size} bytes)`);
        downloadBlob(blob, fileName);
        storeActionsRef.current.addReceived({
          id: crypto.randomUUID(),
          name: fileName,
          size: blob.size,
          type: blob.type,
          from: peerName,
          timestamp: Date.now(),
          blob,
        });
      };

      receiversRef.current.set(peerId, receiver);
    };

    const manager = new PeerManager(SIGNAL_URL, {
      onPeersChanged: (newPeers) => {
        const deviceMap = new Map<string, DeviceInfo>();
        for (const [id, peer] of newPeers) {
          deviceMap.set(id, {
            id,
            name: peer.name,
            deviceType: peer.deviceType,
            connectionState: peer.connectionState,
            hasDataChannel: peer.dataChannel !== null,
          });
        }
        storeActionsRef.current.setDevices(deviceMap);
      },
      onDataChannel: (peerId, channel) => {
        console.log(`[Transfer] Data channel received for ${peerId}, state: ${channel.readyState}`);
        setupReceiver(peerId, channel);
      },
      onConnectionStateChanged: (connected) => {
        storeActionsRef.current.setSignalingConnected(connected);
      },
      onJoined: (peerId, name, joinedRoomId) => {
        storeActionsRef.current.setIdentity(peerId, name);
        if (joinedRoomId) {
          useDeviceStore.getState().setRoomId(joinedRoomId);
        }
      },
    });

    managerRef.current = manager;
    manager.connect(roomId, detectDeviceType(), deviceName);

    return () => {
      console.log(`[Transfer] Cleaning up room: "${roomId}"`);
      for (const [, receiver] of receiversRef.current) {
        receiver.destroy();
      }
      receiversRef.current.clear();
      manager.disconnect();
      managerRef.current = null;
    };
  }, [roomId, deviceName]);

  const sendFiles = useCallback(
    async (peerId: string, files: File[]) => {
      const channel = managerRef.current?.getDataChannel(peerId);
      const peerName =
        useDeviceStore.getState().devices.get(peerId)?.name || "Unknown";

      if (!channel || channel.readyState !== "open") {
        console.error(`[Transfer] No open channel to peer ${peerId} (state: ${channel?.readyState})`);
        return;
      }

      let bundleId: string | undefined;

      // If sending multiple files, send a bundle-offer first and wait for approval
      if (files.length > 1) {
        bundleId = crypto.randomUUID();
        const bundleOffer = {
          type: "bundle-offer" as const,
          bundleId,
          files: files.map(f => ({ fileName: f.name, fileSize: f.size, fileType: f.type })),
          totalSize: files.reduce((sum, f) => sum + f.size, 0),
          totalFiles: files.length,
        };
        channel.send(JSON.stringify(bundleOffer));
        console.log(`[Transfer] Sent bundle-offer (${files.length} files) to ${peerName}`);

        // Wait for bundle-accept or bundle-reject
        const bundleAccepted = await new Promise<boolean>((resolve) => {
          const handler = (event: MessageEvent) => {
            if (typeof event.data !== "string") return;
            try {
              const msg = JSON.parse(event.data);
              if (msg.bundleId !== bundleId) return;
              if (msg.type === "bundle-accept") {
                channel.removeEventListener("message", handler);
                resolve(true);
              } else if (msg.type === "bundle-reject") {
                channel.removeEventListener("message", handler);
                resolve(false);
              }
            } catch { /* ignore non-JSON */ }
          };
          channel.addEventListener("message", handler);

          // Timeout after 60s
          setTimeout(() => {
            channel.removeEventListener("message", handler);
            resolve(false);
          }, 60000);
        });

        if (!bundleAccepted) {
          console.log(`[Transfer] Bundle rejected by ${peerName}`);
          // Update progress for all files as rejected
          for (const file of files) {
            updateTransfer({
              transferId: crypto.randomUUID(),
              fileName: file.name,
              fileSize: file.size,
              status: "rejected",
              progress: 0,
              bytesTransferred: 0,
              speed: 0,
              eta: 0,
              direction: "send",
              peerId,
              peerName,
              errorMessage: "Transfer was declined by the recipient.",
            });
          }
          return;
        }
        console.log(`[Transfer] Bundle accepted by ${peerName}`);
      }

      for (const file of files) {
        const sender = new FileSender(channel, updateTransfer);
        console.log(`[Transfer] Sending ${file.name} (${file.size} bytes) to ${peerName}`);
        const success = await sender.send(file, peerId, peerName, bundleId);
        console.log(`[Transfer] ${file.name}: ${success ? "complete" : "failed"}`);
      }
    },
    [updateTransfer]
  );

  const respondToOffer = useCallback(
    (accept: boolean) => {
      if (pendingOffer) {
        pendingOffer.decide(accept);
        setPendingOffer(null);
      }
    },
    [pendingOffer]
  );

  return {
    pendingOffer,
    sendFiles,
    respondToOffer,
  };
}
