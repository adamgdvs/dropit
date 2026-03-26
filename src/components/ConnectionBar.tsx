import { useState } from "react";
import { useDeviceStore } from "../stores/deviceStore";
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

  const [showPairing, setShowPairing] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connected = connectedDevices();
  const isAutoRoom = !roomId || roomId.startsWith("auto_");

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
    }
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

        {/* Right: Pairing toggle */}
        <div className="flex items-center gap-2">
          {createdCode && (
            <span className="font-mono text-xs font-bold text-primary">{createdCode}</span>
          )}
          <button
            onClick={() => setShowPairing(!showPairing)}
            className={`font-mono text-[10px] border px-3 py-1.5 transition-colors ${
              showPairing
                ? "border-primary text-primary"
                : "border-outline text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {showPairing ? "CLOSE" : "PAIR"}
          </button>
          {!isAutoRoom && (
            <button
              onClick={() => {
                setCreatedCode(null);
                setShowPairing(false);
                joinRoom("auto");
              }}
              className="font-mono text-[10px] text-primary border border-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-colors"
            >
              AUTO
            </button>
          )}
        </div>
      </div>

      {/* Expandable pairing panel */}
      {showPairing && (
        <div className="mt-3 pt-3 border-t border-outline flex flex-wrap items-center gap-3">
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
          {error && (
            <span className="font-mono text-[10px] text-primary">{error}</span>
          )}
        </div>
      )}
    </div>
  );
}
