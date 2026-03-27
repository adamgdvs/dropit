import { useEffect, useRef } from "react";
import type { IncomingTransfer, TransferDecision } from "../services/transfer";
import { formatBytes } from "../services/files";

interface TransferToastProps {
  offer: IncomingTransfer;
  onDecide: TransferDecision;
}

function getOfferIcon(offer: IncomingTransfer): string {
  if (offer.totalFiles && offer.totalFiles > 1) return "folder_zip";
  if (offer.fileType.startsWith("image/")) return "image";
  if (offer.fileType.startsWith("video/")) return "videocam";
  if (offer.fileType.startsWith("audio/")) return "audio_file";
  if (offer.fileType.includes("pdf")) return "picture_as_pdf";
  return "download";
}

function getMediaLabel(offer: IncomingTransfer): string | null {
  if (offer.totalFiles && offer.totalFiles > 1) {
    // Summarize bundle contents
    const images = offer.bundleFiles?.filter((f) => f.fileType.startsWith("image/")).length || 0;
    const videos = offer.bundleFiles?.filter((f) => f.fileType.startsWith("video/")).length || 0;
    const others = (offer.totalFiles || 0) - images - videos;
    const parts: string[] = [];
    if (images > 0) parts.push(`${images} image${images > 1 ? "s" : ""}`);
    if (videos > 0) parts.push(`${videos} video${videos > 1 ? "s" : ""}`);
    if (others > 0) parts.push(`${others} file${others > 1 ? "s" : ""}`);
    return parts.join(", ");
  }
  return null;
}

export default function TransferToast({ offer, onDecide }: TransferToastProps) {
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    acceptRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDecide(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDecide]);

  const icon = getOfferIcon(offer);
  const mediaLabel = getMediaLabel(offer);
  const isBundle = offer.totalFiles && offer.totalFiles > 1;

  return (
    <div
      role="alertdialog"
      aria-label={`Incoming file transfer: ${offer.fileName} from ${offer.peerName}`}
      className="fixed top-4 right-4 z-50 bg-surface border border-on-surface p-6 max-w-sm animate-slide-in"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 border border-primary text-primary flex items-center justify-center shrink-0" aria-hidden="true">
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] text-primary uppercase tracking-[0.2em] mb-1">
            // INCOMING {isBundle ? "BUNDLE" : "TRANSFER"}
          </p>
          <p className="font-bold text-sm uppercase tracking-tight truncate">
            {offer.fileName}
          </p>
          <p className="font-mono text-[10px] text-on-surface-variant mt-1">
            FROM: {offer.peerName.toUpperCase()} &bull; {isBundle
              ? `${offer.totalFiles} files — ${formatBytes(offer.totalSize || offer.fileSize)}`
              : formatBytes(offer.fileSize)}
          </p>
          {mediaLabel && (
            <p className="font-mono text-[10px] text-on-surface-variant mt-0.5">
              {mediaLabel}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <button
          ref={acceptRef}
          onClick={() => onDecide(true)}
          className="py-2.5 bg-primary text-white font-mono text-[10px] uppercase tracking-wider hover:bg-primary-hover transition-colors min-h-[44px]"
          aria-label={`Accept ${isBundle ? `${offer.totalFiles} files` : offer.fileName}`}
        >
          Accept{isBundle ? ` All (${offer.totalFiles})` : ""}
        </button>
        <button
          onClick={() => onDecide(false)}
          className="py-2.5 border border-outline text-on-surface-variant font-mono text-[10px] uppercase tracking-wider hover:border-on-surface hover:text-on-surface transition-colors min-h-[44px]"
          aria-label={`Decline file ${offer.fileName}`}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
