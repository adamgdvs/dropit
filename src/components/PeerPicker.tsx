import { useEffect } from "react";

interface PeerInfo {
  id: string;
  name: string;
  deviceType: string;
  connectionState: string;
}

interface PeerPickerProps {
  peers: PeerInfo[];
  files: File[];
  onSelect: (peerId: string) => void;
  onCancel: () => void;
}

const deviceIcons: Record<string, string> = {
  phone: "smartphone",
  tablet: "tablet_mac",
  desktop: "laptop_mac",
  laptop: "laptop_mac",
};

export default function PeerPicker({ peers, files, onSelect, onCancel }: PeerPickerProps) {
  const connectedPeers = peers.filter((p) => p.connectionState === "connected");
  const fileLabel = files.length === 1 ? files[0].name : `${files.length} files`;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a device to send files to"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      onKeyDown={() => {}}
    >
      <div className="bg-surface border border-on-surface p-8 max-w-md w-full mx-4">
        <p className="font-mono text-[10px] text-primary uppercase tracking-[0.2em] mb-2">
          // SELECT_TARGET
        </p>
        <h3 className="font-bold text-2xl uppercase tracking-tight mb-1">
          Send To
        </h3>
        <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-8">
          PAYLOAD: {fileLabel.toUpperCase()}
        </p>

        {connectedPeers.length === 0 ? (
          <div className="text-center py-8 border border-outline">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2" aria-hidden="true">
              sensors_off
            </span>
            <p className="font-bold text-sm text-on-surface-variant uppercase">
              No targets detected
            </p>
            <p className="font-mono text-[10px] text-on-surface-variant mt-1">
              Open DropIt on another device on the same network
            </p>
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="Connected devices">
            {connectedPeers.map((peer, i) => (
              <button
                key={peer.id}
                onClick={() => onSelect(peer.id)}
                className="w-full flex items-center gap-4 p-4 border border-outline bg-background hover:border-primary hover:bg-primary/5 transition-colors group text-left min-h-[48px]"
                aria-label={`Send to ${peer.name}`}
              >
                <span className="font-mono text-[10px] text-on-surface-variant w-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="w-9 h-9 border border-outline text-on-surface-variant group-hover:border-primary group-hover:text-primary flex items-center justify-center transition-colors" aria-hidden="true">
                  <span className="material-symbols-outlined text-base">
                    {deviceIcons[peer.deviceType] || "devices"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm uppercase tracking-tight truncate">{peer.name}</p>
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase">
                    {peer.deviceType} &bull; Connected
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary text-base transition-colors">
                  arrow_forward
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onCancel}
          className="w-full mt-6 py-2.5 border border-outline text-on-surface-variant font-mono text-[10px] uppercase tracking-wider hover:border-on-surface hover:text-on-surface transition-colors min-h-[44px]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
