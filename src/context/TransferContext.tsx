import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useTransfer, type PendingOffer } from "../hooks/useTransfer";

interface TransferContextValue {
  pendingOffer: PendingOffer | null;
  sendFiles: (peerId: string, files: File[]) => Promise<void>;
  respondToOffer: (accept: boolean) => void;
  joinRoom: (roomId: string) => void;
}

const TransferContext = createContext<TransferContextValue | null>(null);

export function TransferProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomFromUrl = searchParams.get("room") || undefined;

  const { pendingOffer, sendFiles, respondToOffer, reconnectToRoom } = useTransfer({
    roomId: roomFromUrl,
  });

  const joinRoom = useCallback(
    (roomId: string) => {
      if (roomId === "auto") {
        // Clear room param from URL, reconnect to auto
        setSearchParams((prev) => {
          prev.delete("room");
          return prev;
        });
        reconnectToRoom("auto");
      } else {
        setSearchParams({ room: roomId });
        reconnectToRoom(roomId);
      }
    },
    [setSearchParams, reconnectToRoom]
  );

  return (
    <TransferContext.Provider value={{ pendingOffer, sendFiles, respondToOffer, joinRoom }}>
      {children}
    </TransferContext.Provider>
  );
}

export function useTransferContext(): TransferContextValue {
  const ctx = useContext(TransferContext);
  if (!ctx) {
    throw new Error("useTransferContext must be used within a TransferProvider");
  }
  return ctx;
}
