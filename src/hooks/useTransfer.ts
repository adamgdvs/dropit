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
