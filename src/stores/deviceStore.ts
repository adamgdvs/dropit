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
  myId: string | null;
  myName: string | null;
  roomId: string | null;
  isSignalingConnected: boolean;

  // Actions
  setDevices: (devices: Map<string, DeviceInfo>) => void;
  setIdentity: (id: string, name: string) => void;
  setRoomId: (roomId: string) => void;
  setSignalingConnected: (connected: boolean) => void;

  // Derived
  connectedDevices: () => DeviceInfo[];
  deviceList: () => DeviceInfo[];
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: new Map(),
  myId: null,
  myName: null,
  roomId: null,
  isSignalingConnected: false,

  setDevices: (devices) => set({ devices: new Map(devices) }),

  setIdentity: (id, name) => set({ myId: id, myName: name }),

  setRoomId: (roomId) => set({ roomId }),

  setSignalingConnected: (connected) => set({ isSignalingConnected: connected }),

  connectedDevices: () =>
    Array.from(get().devices.values()).filter((d) => d.connectionState === "connected"),

  deviceList: () => Array.from(get().devices.values()),
}));
