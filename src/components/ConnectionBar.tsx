import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useDeviceStore } from "../stores/deviceStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useTransferContext } from "../context/TransferContext";

function getSignalHttpUrl(): string {
  const wsUrl = import.meta.env.VITE_SIGNAL_URL || "ws://localhost:3001";
  try {
    if (wsUrl.startsWith("ws://") || wsUrl.startsWith("wss://")) {
      return wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
    }
    return `https://${wsUrl}`;
  } catch {
    return "http://localhost:3001";
  }
}

const SIGNAL_HTTP_URL = getSignalHttpUrl();

export default function ConnectionBar() {
  const myName = useDeviceStore((s) => s.myName);
  const roomId = useDeviceStore((s) => s.roomId);
  const isConnected = useDeviceStore((s) => s.isSignalingConnected);
  const connectedDevices = useDeviceStore((s) => s.connectedDevices);
  const { joinRoom } = useTransferContext();
  const theme = useSettingsStore((s) => s.theme);
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const cycleTheme = () => {
    const order: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const themeIcon =
    theme === "system" ? "brightness_auto" :
    resolvedTheme() === "dark" ? "dark_mode" : "light_mode";

  const [showPairing, setShowPairing] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const connected = connectedDevices();
  const isAutoRoom = !roomId || roomId.startsWith("auto_");

  const shareableLink = createdCode
    ? `${window.location.origin}${window.location.pathname}?room=${createdCode}`
    : null;

  const handleCreateRoom = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${SIGNAL_HTTP_URL}/api/room`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const code = data.roomCode as string;
      if (!code) throw new Error("No roomCode in response");
      setCreatedCode(code);
      setShowQR(false);
      setCopied(false);
      joinRoom(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code) {
      joinRoom(code);
      setShowPairing(false);
      setJoinCode("");
      setError(null);
      setCreatedCode(null);
      setShowQR(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareableLink) {
      try {
        await navigator.clipboard.writeText(shareableLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback: select text in a temporary input
        const input = document.createElement("input");
        input.value = shareableLink;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleBackToAuto = () => {
    setCreatedCode(null);
    setShowPairing(false);
    setShowQR(false);
    joinRoom("auto");
  };

  return (
    <div className="bg-surface border-b border-outline px-4 md:px-8 py-2.5">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 shrink-0 ${isConnected ? "bg-primary" : "bg-on-surface-variant"}`} />
          <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider truncate">
            {myName || "Connecting..."}
          </span>
          {!isAutoRoom && (
            <span className="font-mono text-[10px] text-primary font-bold">
              {roomId}
            </span>
          )}
        </div>

        {/* Center: Connected peers */}
        <div className="flex items-center gap-2">
          {connected.length > 0 ? (
            connected.map((d) => (
              <div key={d.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 border border-primary/20">
                <span className="material-symbols-outlined text-primary text-sm">
                  {d.deviceType === "phone" ? "smartphone" : d.deviceType === "tablet" ? "tablet_mac" : "laptop_mac"}
                </span>
                <span className="font-mono text-[11px] font-bold text-on-surface uppercase">
                  {d.name}
                </span>
                <span className="w-1.5 h-1.5 bg-primary" />
              </div>
            ))
          ) : (
            <span className="font-mono text-[10px] text-on-surface-variant">
              {isConnected ? "NO DEVICES" : "OFFLINE"}
            </span>
          )}
        </div>

        {/* Right: Theme + Pairing */}
        <div className="flex items-center gap-2">
          <button
            onClick={cycleTheme}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            aria-label={`Switch theme, current: ${theme}`}
          >
            <span className="material-symbols-outlined text-lg">{themeIcon}</span>
          </button>
          <button
            onClick={() => setShowPairing(!showPairing)}
            aria-expanded={showPairing}
            aria-label={showPairing ? "Close pairing panel" : "Open pairing panel"}
            className={`font-mono text-[10px] border px-3 py-1.5 min-h-[44px] min-w-[44px] transition-colors ${
              showPairing
                ? "border-primary text-primary"
                : "border-outline text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {showPairing ? "CLOSE" : "PAIR"}
          </button>
          {!isAutoRoom && (
            <button
              onClick={handleBackToAuto}
              className="font-mono text-[10px] text-primary border border-primary px-3 py-1.5 min-h-[44px] hover:bg-primary hover:text-white transition-colors"
            >
              AUTO
            </button>
          )}
        </div>
      </div>

      {/* Expandable pairing panel */}
      {showPairing && (
        <div className="mt-3 pt-3 border-t border-outline">
          {/* Created code display with QR + copy link */}
          {createdCode ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-on-surface-variant">CODE:</span>
                  <span className="font-mono text-lg font-bold text-primary tracking-wider">
                    {createdCode}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="font-mono text-[10px] border border-outline px-3 py-1.5 hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copied ? "check" : "content_copy"}
                    </span>
                    {copied ? "COPIED" : "COPY LINK"}
                  </button>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className={`font-mono text-[10px] border px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
                      showQR
                        ? "border-primary text-primary"
                        : "border-outline text-on-surface-variant hover:border-primary hover:text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">qr_code_2</span>
                    QR
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    disabled={creating}
                    className="font-mono text-[10px] border border-outline text-on-surface-variant px-3 py-1.5 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    NEW CODE
                  </button>
                </div>
              </div>

              {/* QR Code */}
              {showQR && shareableLink && (
                <div className="flex items-start gap-4">
                  <div className="bg-white p-3 border border-outline">
                    <QRCodeSVG
                      value={shareableLink}
                      size={140}
                      bgColor="#ffffff"
                      fgColor="#1A1A1A"
                      level="M"
                    />
                  </div>
                  <div className="font-mono text-[10px] text-on-surface-variant space-y-2 pt-1">
                    <p>Scan this QR code from the other device's camera to connect instantly.</p>
                    <p className="text-on-surface-variant/60 break-all">{shareableLink}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No code created yet — show create + join options */
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCreateRoom}
                disabled={creating}
                className="font-mono text-[10px] bg-primary text-white px-4 py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {creating ? "..." : "CREATE CODE"}
              </button>
              <span className="font-mono text-[10px] text-on-surface-variant">or</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  placeholder="ENTER CODE"
                  autoFocus
                  className="bg-background border border-outline px-3 py-2 font-mono text-xs uppercase tracking-wider placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition-colors w-36"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!joinCode.trim()}
                  className="px-4 py-2 bg-on-surface text-background font-mono text-[10px] uppercase hover:bg-primary transition-colors disabled:opacity-50"
                >
                  JOIN
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="font-mono text-[10px] text-primary mt-2">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
