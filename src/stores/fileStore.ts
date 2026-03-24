import { create } from "zustand";

export interface ReceivedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  from: string;
  timestamp: number;
  blob: Blob;
}

export interface QueuedFile {
  id: string;
  file: File;
  addedAt: number;
}

interface FileState {
  received: ReceivedFile[];
  queued: QueuedFile[];

  // Actions
  addReceived: (file: ReceivedFile) => void;
  clearReceived: () => void;
  removeReceived: (id: string) => void;
  addQueued: (files: File[]) => void;
  removeQueued: (id: string) => void;
  clearQueued: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  received: [],
  queued: [],

  addReceived: (file) =>
    set((state) => ({
      received: [file, ...state.received].slice(0, 100),
    })),

  clearReceived: () => set({ received: [] }),

  removeReceived: (id) =>
    set((state) => ({
      received: state.received.filter((f) => f.id !== id),
    })),

  addQueued: (files) =>
    set((state) => ({
      queued: [
        ...state.queued,
        ...files.map((f) => ({
          id: crypto.randomUUID(),
          file: f,
          addedAt: Date.now(),
        })),
      ],
    })),

  removeQueued: (id) =>
    set((state) => ({
      queued: state.queued.filter((f) => f.id !== id),
    })),

  clearQueued: () => set({ queued: [] }),
}));
