import { create } from "zustand";
import type { ConnectionState } from "../services/webrtc";

export interface DeviceInfo {
  id: string;
  name: string;
  deviceType: string;
  connectionState: ConnectionState;
  hasDataChannel: boolean;
}

interface DeviceState {
  devices: Map<string, DeviceInfo>;
  /** Pre-computed arrays — updated every time devices changes */
  deviceArray: DeviceInfo[];
  connectedArray: DeviceInfo[];
  myId: string | null;
  myName: string | null;
  roomId: string | null;
  isSignalingConnected: boolean;

  // Actions
  setDevices: (devices: Map<string, DeviceInfo>) => void;
  setIdentity: (id: string, name: string) => void;
  setRoomId: (roomId: string) => void;
  setSignalingConnected: (connected: boolean) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: new Map(),
  deviceArray: [],
  connectedArray: [],
  myId: null,
  myName: null,
  roomId: null,
  isSignalingConnected: false,

  setDevices: (devices) => {
    const newMap = new Map(devices);
    const all = Array.from(newMap.values());
    set({
      devices: newMap,
      deviceArray: all,
      connectedArray: all.filter((d) => d.connectionState === "connected"),
    });
  },

  setIdentity: (id, name) => set({ myId: id, myName: name }),

  setRoomId: (roomId) => set({ roomId }),

  setSignalingConnected: (connected) => set({ isSignalingConnected: connected }),
}));
