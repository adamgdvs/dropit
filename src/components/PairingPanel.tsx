import { useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useDeviceStore } from "../stores/deviceStore";

const SIGNAL_HTTP_URL = (() => {
  const wsUrl = import.meta.env.VITE_SIGNAL_URL || "ws://localhost:3001";
  const url = new URL(wsUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  return url.origin;
})();

interface PairingPanelProps {
  onJoinRoom: (roomId: string) => void;
}

export default function PairingPanel({ onJoinRoom }: PairingPanelProps) {
  const roomId = useDeviceStore((s) => s.roomId);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareableLink = createdCode
    ? `${window.location.origin}?room=${createdCode}`
    : null;

  const handleCreateRoom = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SIGNAL_HTTP_URL}/api/room`, { method: "POST" });
      const data = await res.json();
      const code = data.roomCode as string;
      setCreatedCode(code);
      onJoinRoom(code);
    } catch (err) {
      console.error("[Pairing] Failed to create room:", err);
    } finally {
      setLoading(false);
    }
  }, [onJoinRoom]);

  const handleJoinRoom = useCallback(() => {
    const code = joinCode.trim().toUpperCase();
    if (code) {
      onJoinRoom(code);
      setShowJoin(false);
      setJoinCode("");
    }
  }, [joinCode, onJoinRoom]);

  const handleCopyLink = useCallback(async () => {
    if (shareableLink) {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareableLink]);

  return (
    <div className="border border-outline bg-surface p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-mono text-[10px] text-primary uppercase tracking-[0.2em] mb-1">
            // NETWORK_PAIRING
          </p>
          <h3 className="font-bold text-sm uppercase tracking-tight">Connection</h3>
        </div>
        {roomId && (
          <span className="font-mono text-[10px] text-on-surface-variant border border-outline px-2 py-1">
            ROOM: {roomId.startsWith("auto_") ? "AUTO" : roomId}
          </span>
        )}
      </div>

      {/* Auto-discovery status */}
      <div className="flex items-center gap-2 mb-4 font-mono text-[10px] text-on-surface-variant">
        <span className="w-2 h-2 bg-primary inline-block" />
        <span>Same-network auto-discovery active</span>
      </div>

      {/* Created room code display */}
      {createdCode && (
        <div className="border border-primary bg-primary/5 p-4 mb-4">
          <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-2">
            Share this code with the other device:
          </p>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-2xl font-bold text-primary tracking-wider">
              {createdCode}
            </span>
            <button
              onClick={handleCopyLink}
              className="font-mono text-[10px] text-on-surface-variant border border-outline px-2 py-1 hover:border-primary hover:text-primary transition-colors"
            >
              {copied ? "COPIED" : "COPY LINK"}
            </button>
          </div>

          {/* QR Toggle */}
          <button
            onClick={() => setShowQR(!showQR)}
            className="font-mono text-[10px] text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">qr_code_2</span>
            {showQR ? "Hide QR" : "Show QR Code"}
          </button>
          {showQR && shareableLink && (
            <div className="mt-3 inline-block bg-white p-3">
              <QRCodeSVG
                value={shareableLink}
                size={160}
                bgColor="#ffffff"
                fgColor="#1A1A1A"
                level="M"
              />
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!createdCode && (
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="flex-1 border border-primary text-primary font-mono text-[10px] uppercase py-2 hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Room Code"}
          </button>
        )}
        {createdCode && (
          <button
            onClick={() => {
              setCreatedCode(null);
              setShowQR(false);
              onJoinRoom("auto");
            }}
            className="flex-1 border border-outline text-on-surface-variant font-mono text-[10px] uppercase py-2 hover:border-on-surface hover:text-on-surface transition-colors"
          >
            Back to Auto
          </button>
        )}
        <button
          onClick={() => setShowJoin(!showJoin)}
          className="flex-1 border border-outline text-on-surface-variant font-mono text-[10px] uppercase py-2 hover:border-primary hover:text-primary transition-colors"
        >
          Enter Code
        </button>
      </div>

      {/* Join room input */}
      {showJoin && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
            placeholder="FALCON-123"
            className="flex-1 bg-background border border-outline px-3 py-2 font-mono text-sm uppercase tracking-wider placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition-colors"
          />
          <button
            onClick={handleJoinRoom}
            disabled={!joinCode.trim()}
            className="px-4 py-2 bg-primary text-white font-mono text-[10px] uppercase hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            Join
          </button>
        </div>
      )}
    </div>
  );
}
