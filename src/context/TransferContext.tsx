import { createContext, useContext, useCallback, useRef, type ReactNode } from "react";
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

  // Read room from URL ONLY on first render — navigation between pages won't change it
  const initialRoomRef = useRef(searchParams.get("room") || undefined);

  const { pendingOffer, sendFiles, respondToOffer, switchRoom } = useTransfer({
    roomId: initialRoomRef.current,
  });

  // joinRoom: update the URL for shareability AND switch the actual room
  const joinRoom = useCallback(
    (roomId: string) => {
      // Update URL
      if (roomId === "auto") {
        setSearchParams((prev) => {
          prev.delete("room");
          return prev;
        });
      } else {
        setSearchParams({ room: roomId });
      }
      // Actually switch the room in PeerManager
      switchRoom(roomId);
    },
    [setSearchParams, switchRoom]
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
