import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useTransfer, type PendingOffer } from "../hooks/useTransfer";
import type { TextShareMessage } from "../services/transfer";

interface TransferContextValue {
  pendingOffer: PendingOffer | null;
  receivedText: TextShareMessage | null;
  sendFiles: (peerId: string, files: File[]) => Promise<void>;
  sendText: (peerId: string, text: string) => void;
  respondToOffer: (accept: boolean) => void;
  dismissReceivedText: () => void;
  joinRoom: (roomId: string) => void;
}

const TransferContext = createContext<TransferContextValue | null>(null);

export function TransferProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomFromUrl = searchParams.get("room") || undefined;

  const { pendingOffer, receivedText, sendFiles, sendText, respondToOffer, dismissReceivedText } = useTransfer({
    roomId: roomFromUrl,
  });

  // Only update the URL — the useEffect in useTransfer reacts to roomId changes
  const joinRoom = useCallback(
    (roomId: string) => {
      if (roomId === "auto") {
        setSearchParams((prev) => {
          prev.delete("room");
          return prev;
        });
      } else {
        setSearchParams({ room: roomId });
      }
    },
    [setSearchParams]
  );

  return (
    <TransferContext.Provider value={{ pendingOffer, receivedText, sendFiles, sendText, respondToOffer, dismissReceivedText, joinRoom }}>
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
