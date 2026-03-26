import { create } from "zustand";

export interface ReceivedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  from: string;
  timestamp: number;
  blob: Blob;
  previewUrl?: string; // Object URL for image/video thumbnails
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

  addReceived: (file) => {
    // Auto-generate preview URL for media types
    const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
    const previewUrl = isMedia ? URL.createObjectURL(file.blob) : undefined;
    set((state) => ({
      received: [{ ...file, previewUrl }, ...state.received].slice(0, 100),
    }));
  },

  clearReceived: () => {
    const { received } = useFileStore.getState();
    received.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    set({ received: [] });
  },

  removeReceived: (id) =>
    set((state) => {
      const file = state.received.find(f => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return { received: state.received.filter((f) => f.id !== id) };
    }),

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
