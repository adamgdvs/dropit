import { create } from "zustand";
import type { TransferProgress, TransferStatus } from "../services/transfer";

interface TransferState {
  active: Map<string, TransferProgress>;
  history: TransferProgress[];

  // Actions
  updateTransfer: (progress: TransferProgress) => void;
  clearCompleted: () => void;
  clearAll: () => void;

  // Derived
  activeList: () => TransferProgress[];
  sendingList: () => TransferProgress[];
  receivingList: () => TransferProgress[];
  totalSpeed: () => number;
}

const TERMINAL_STATUSES: TransferStatus[] = ["complete", "failed", "rejected"];

export const useTransferStore = create<TransferState>((set, get) => ({
  active: new Map(),
  history: [],

  updateTransfer: (progress) =>
    set((state) => {
      const next = new Map(state.active);

      if (TERMINAL_STATUSES.includes(progress.status)) {
        // Move to history
        next.delete(progress.transferId);
        return {
          active: next,
          history: [progress, ...state.history].slice(0, 50), // Keep last 50
        };
      }

      next.set(progress.transferId, progress);
      return { active: next };
    }),

  clearCompleted: () =>
    set((state) => ({
      history: state.history.filter((t) => t.status !== "complete"),
    })),

  clearAll: () => set({ active: new Map(), history: [] }),

  activeList: () => Array.from(get().active.values()),
  sendingList: () => Array.from(get().active.values()).filter((t) => t.direction === "send"),
  receivingList: () => Array.from(get().active.values()).filter((t) => t.direction === "receive"),
  totalSpeed: () =>
    Array.from(get().active.values()).reduce((sum, t) => sum + t.speed, 0),
}));
