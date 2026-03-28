import { create } from "zustand";
import type { TransferProgress, TransferStatus } from "../services/transfer";

interface TransferState {
  active: Map<string, TransferProgress>;
  history: TransferProgress[];
  /** Pre-computed arrays — updated every time active changes */
  activeArray: TransferProgress[];

  // Actions
  updateTransfer: (progress: TransferProgress) => void;
  clearCompleted: () => void;
  clearAll: () => void;
}

const TERMINAL_STATUSES: TransferStatus[] = ["complete", "failed", "rejected"];

export const useTransferStore = create<TransferState>((set) => ({
  active: new Map(),
  history: [],
  activeArray: [],

  updateTransfer: (progress) =>
    set((state) => {
      const next = new Map(state.active);

      if (TERMINAL_STATUSES.includes(progress.status)) {
        next.delete(progress.transferId);
        return {
          active: next,
          activeArray: Array.from(next.values()),
          history: [progress, ...state.history].slice(0, 50),
        };
      }

      next.set(progress.transferId, progress);
      return {
        active: next,
        activeArray: Array.from(next.values()),
      };
    }),

  clearCompleted: () =>
    set((state) => ({
      history: state.history.filter((t) => t.status !== "complete"),
    })),

  clearAll: () => set({ active: new Map(), history: [], activeArray: [] }),
}));
