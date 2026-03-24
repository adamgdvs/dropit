import { useState } from "react";
import { useDeviceStore } from "../stores/deviceStore";
import { useTransferContext } from "../context/TransferContext";

export default function ConnectionBar() {
  const myName = useDeviceStore((s) => s.myName);
  const roomId = useDeviceStore((s) => s.roomId);
  const isConnected = useDeviceStore((s) => s.isSignalingConnected);
  const connectedDevices = useDeviceStore((s) => s.connectedDevices);
  const { joinRoom } = useTransferContext();

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const connected = connectedDevices();

  const signalHttpUrl = (() => {
    const wsUrl = import.meta.env.VITE_SIGNAL_URL || "ws://localhost:3001";
    try {
      const url = new URL(wsUrl);
      url.protocol = url.protocol === "wss:" ? "https:" : "http:";
      return url.origin;
    } catch {
      return "http://localhost:3001";
    }
  })();

  const handleCreateRoom = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${signalHttpUrl}/api/room`, { method: "POST" });
      const data = await res.json();
      const code = data.roomCode as string;
      setCreatedCode(code);
      joinRoom(code);
    } catch (err) {
      console.error("[ConnectionBar] Failed to create room:", err);
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
    }
  };

  const isAutoRoom = !roomId || roomId.startsWith("auto_");

  return (
    <div className="bg-surface border-b border-outline px-4 md:px-8 py-3">
      {/* Main status row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: identity + status */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Connection indicator */}
          <div className={`w-2 h-2 shrink-0 ${isConnected ? "bg-primary" : "bg-on-surface-variant"}`} />

          {/* My name */}
          <div className="min-w-0">
            <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider truncate block">
              {myName || "Connecting..."}
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant">
              {isAutoRoom ? "AUTO-DISCOVERY" : `ROOM: ${roomId}`}
            </span>
          </div>
        </div>

        {/* Center: connected devices */}
        <div className="flex items-center gap-2 flex-wrap">
          {connected.length > 0 ? (
            connected.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2 bg-primary/5 border border-primary/20 px-3 py-1.5"
              >
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
