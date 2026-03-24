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
  const { roomId = "auto", deviceName } = options;

  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);
  const managerRef = useRef<PeerManager | null>(null);
  const receiversRef = useRef<Map<string, FileReceiver>>(new Map());

  // Zustand store actions
  const setDevices = useDeviceStore((s) => s.setDevices);
  const setIdentity = useDeviceStore((s) => s.setIdentity);
  const setSignalingConnected = useDeviceStore((s) => s.setSignalingConnected);
  const updateTransfer = useTransferStore((s) => s.updateTransfer);
  const addReceived = useFileStore((s) => s.addReceived);

  const handleIncomingOffer = useCallback(
    (offer: IncomingTransfer, decide: TransferDecision) => {
      setPendingOffer({ offer, decide });
    },
    []
  );

  const setupReceiver = useCallback(
    (peerId: string, channel: RTCDataChannel) => {
      const peerName = managerRef.current?.getPeers().get(peerId)?.name || "Unknown";

      receiversRef.current.get(peerId)?.destroy();

      const receiver = new FileReceiver(
        channel,
        peerId,
        peerName,
        updateTransfer,
        handleIncomingOffer
      );

      receiver.onFileReceived = (blob, fileName) => {
        console.log(`[Transfer] File received: ${fileName} (${blob.size} bytes)`);
        downloadBlob(blob, fileName);
        addReceived({
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
    },
    [updateTransfer, handleIncomingOffer, addReceived]
  );

  const createManager = useCallback(
    (targetRoomId: string) => {
      // Cleanup old
      for (const [, receiver] of receiversRef.current) {
        receiver.destroy();
      }
      receiversRef.current.clear();
      managerRef.current?.disconnect();

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
          setDevices(deviceMap);
        },
        onDataChannel: (peerId, channel) => {
          console.log(`[Transfer] Data channel ready with ${peerId}`);
          setupReceiver(peerId, channel);
        },
        onConnectionStateChanged: (connected) => {
          setSignalingConnected(connected);
        },
        onJoined: (peerId, name, joinedRoomId) => {
          setIdentity(peerId, name);
          if (joinedRoomId) {
            useDeviceStore.getState().setRoomId(joinedRoomId);
          }
        },
      });

      managerRef.current = manager;
      manager.connect(targetRoomId, detectDeviceType(), deviceName);
    },
    [deviceName, setupReceiver, setDevices, setSignalingConnected, setIdentity]
  );

  // Connect on mount and when roomId changes (room code pairing)
  useEffect(() => {
    console.log(`[Transfer] Connecting to room: "${roomId}"`);
    createManager(roomId);

    return () => {
      console.log(`[Transfer] Cleaning up room: "${roomId}"`);
      for (const [, receiver] of receiversRef.current) {
        receiver.destroy();
      }
      receiversRef.current.clear();
      managerRef.current?.disconnect();
      managerRef.current = null;
    };
  }, [roomId, createManager]);

  const sendFiles = useCallback(
    async (peerId: string, files: File[]) => {
      const channel = managerRef.current?.getDataChannel(peerId);
      const peerName =
        useDeviceStore.getState().devices.get(peerId)?.name || "Unknown";

      if (!channel || channel.readyState !== "open") {
        console.error(`[Transfer] No open channel to peer ${peerId}`);
        return;
      }

      for (const file of files) {
        const sender = new FileSender(channel, updateTransfer);
        console.log(`[Transfer] Sending ${file.name} (${file.size} bytes) to ${peerName}`);
        const success = await sender.send(file, peerId, peerName);
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
