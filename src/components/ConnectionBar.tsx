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
  const deviceList = useDeviceStore((s) => s.deviceList);
  const { joinRoom } = useTransferContext();

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Show ALL peers, not just connected ones — so we can see connection state
  const allPeers = deviceList();

  const handleCreateRoom = async () => {
    setCreating(true);
    setError(null);
    try {
      const url = `${SIGNAL_HTTP_URL}/api/room`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const code = data.roomCode as string;
      if (!code) throw new Error("No roomCode in response");
      setCreatedCode(code);
      joinRoom(code);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[ConnectionBar] Failed to create room:", msg);
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code) {
      joinRoom(code);
      setShowJoin(false);
      setJoinCode("");
      setError(null);
    }
  };

  const isAutoRoom = !roomId || roomId.startsWith("auto_");

  const stateColor = (state: string) => {
    if (state === "connected") return "bg-primary";
    if (state === "connecting") return "bg-yellow-500";
    if (state === "failed") return "bg-red-500";
    return "bg-on-surface-variant";
  };

  const stateLabel = (state: string) => {
    if (state === "connected") return "LIVE";
    if (state === "connecting") return "CONNECTING";
    if (state === "failed") return "FAILED";
    if (state === "new") return "NEW";
    return state.toUpperCase();
  };

  return (
    <div className="bg-surface border-b border-outline px-4 md:px-8 py-3">
      {/* Main status row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: identity + status */}
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-2 h-2 shrink-0 ${isConnected ? "bg-primary" : "bg-on-surface-variant"}`} />
          <div className="min-w-0">
            <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider truncate block">
              {myName || "Connecting..."}
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant">
              {isAutoRoom ? "AUTO-DISCOVERY" : `ROOM: ${roomId}`}
            </span>
          </div>
        </div>

        {/* Center: all peers with state */}
        <div className="flex items-center gap-2 flex-wrap">
          {allPeers.length > 0 ? (
            allPeers.map((d) => (
              <div
                key={d.id}
                className={`flex items-center gap-2 px-3 py-1.5 border ${
                  d.connectionState === "connected"
                    ? "bg-primary/5 border-primary/20"
                    : "bg-surface-variant/30 border-outline"
                }`}
              >
                <span className={`material-symbols-outlined text-sm ${
                  d.connectionState === "connected" ? "text-primary" : "text-on-surface-variant"
                }`}>
                  {d.deviceType === "phone" ? "smartphone" : d.deviceType === "tablet" ? "tablet_mac" : "laptop_mac"}
                </span>
                <span className="font-mono text-[11px] font-bold text-on-surface uppercase">
                  {d.name}
                </span>
                <span className={`w-1.5 h-1.5 ${stateColor(d.connectionState)}`} />
                <span className="font-mono text-[8px] text-on-surface-variant">
                  {stateLabel(d.connectionState)}
                </span>
              </div>
            ))
          ) : (
            <span className="font-mono text-[10px] text-on-surface-variant">
              {isConnected ? "NO DEVICES NEARBY" : "OFFLINE"}
            </span>
          )}
        </div>

        {/* Right: pairing actions */}
        <div className="flex items-center gap-2">
          {createdCode && (
            <span className="font-mono text-xs font-bold text-primary border border-primary px-2 py-1">
              {createdCode}
            </span>
          )}
          <button
            onClick={handleCreateRoom}
            disabled={creating}
            className="font-mono text-[10px] text-on-surface-variant border border-outline px-3 py-1.5 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {creating ? "..." : "CREATE CODE"}
          </button>
          <button
            onClick={() => setShowJoin(!showJoin)}
            className="font-mono text-[10px] text-on-surface-variant border border-outline px-3 py-1.5 hover:border-primary hover:text-primary transition-colors"
          >
            JOIN CODE
          </button>
          {!isAutoRoom && (
            <button
              onClick={() => {
                setCreatedCode(null);
                joinRoom("auto");
              }}
              className="font-mono text-[10px] text-primary border border-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-colors"
            >
              AUTO
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-2 font-mono text-[10px] text-primary">
          ERROR: {error}
        </div>
      )}

      {/* Join code input row */}
      {showJoin && (
        <div className="mt-3 flex gap-2 max-w-sm">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
            placeholder="FALCON-123"
            autoFocus
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
