import { useTransferContext } from "../context/TransferContext";
import { useDeviceStore } from "../stores/deviceStore";
import { useTransferStore } from "../stores/transferStore";
import { formatBytes } from "../services/files";
import ProgressBar from "../components/ProgressBar";
import DropZone from "../components/DropZone";
import { useState } from "react";

const deviceIcons: Record<string, string> = {
  phone: "smartphone",
  tablet: "tablet_mac",
  desktop: "laptop_mac",
};

export default function Send() {
  const { sendFiles } = useTransferContext();
  const deviceList = useDeviceStore((s) => s.deviceList);
  const activeList = useTransferStore((s) => s.activeList);
  const history = useTransferStore((s) => s.history);
  const totalSpeed = useTransferStore((s) => s.totalSpeed);
  const clearAll = useTransferStore((s) => s.clearAll);

  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);

  const peers = deviceList();
  const nearbyDevices = peers.filter((d) => d.connectionState === "connected");
  const transfers = activeList();
  const completedSends = history.filter((t) => t.direction === "send");
  const activeCount = transfers.filter((t) => t.status !== "complete").length;

  const handleQueueFiles = (files: File[]) => {
    if (selectedPeer) {
      sendFiles(selectedPeer, files);
    } else if (nearbyDevices.length === 1) {
      sendFiles(nearbyDevices[0].id, files);
    }
  };

  return (
    <div className="px-4 pt-6 pb-6 md:px-12 md:pt-12 md:pb-12 min-h-screen bg-[repeating-linear-gradient(to_right,var(--color-outline)_0px,var(--color-outline)_1px,transparent_1px,transparent_80px),repeating-linear-gradient(to_bottom,var(--color-outline)_0px,var(--color-outline)_1px,transparent_1px,transparent_80px)]">
      <header className="mb-8 md:mb-12 border-b border-outline pb-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-4">
          Artifact Transfer
        </h1>
        <p className="font-mono text-primary text-sm uppercase">
          Direct device-to-device streaming on Kinetic network.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Left: Nearby Targets */}
        <div className="lg:w-1/3 flex flex-col">
          <div className="flex justify-between items-center mb-6 border-b border-outline pb-4">
            <h2 className="font-bold text-xl tracking-wide uppercase flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
              </svg>
              Nearby Targets
            </h2>
            <span className="font-mono text-xs border border-outline px-2 py-1 text-on-surface-variant">
              {nearbyDevices.length} FOUND
            </span>
          </div>

          {nearbyDevices.length === 0 ? (
            <div className="border border-outline p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">radar</span>
              <p className="font-mono text-sm font-bold text-on-surface-variant uppercase">Scanning...</p>
              <p className="font-mono text-[10px] text-on-surface-variant mt-1">
                Open DropIt on another device
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyDevices.map((device) => (
                <div
                  key={device.id}
                  onClick={() => setSelectedPeer(device.id)}
                  className={`border p-6 cursor-pointer transition-colors relative corner-marks ${
                    selectedPeer === device.id
                      ? "border-primary bg-primary/5"
                      : "border-outline hover:border-primary"
                  }`}
                >
                  <div className={`w-12 h-12 border flex items-center justify-center mb-6 text-primary ${
                    selectedPeer === device.id ? "border-primary" : "border-outline"
                  }`}>
                    <span className="material-symbols-outlined">
                      {deviceIcons[device.deviceType] || "devices"}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg tracking-wide uppercase mb-1">{device.name}</h3>
                  <p className="font-mono text-[10px] text-primary uppercase">{device.deviceType} Node</p>
                </div>
              ))}
            </div>
          )}

          {/* Completed sends */}
          {completedSends.length > 0 && (
            <div className="mt-8">
              <h3 className="font-bold uppercase tracking-wide mb-4 border-b border-outline pb-3 text-sm">
                Operation Log
              </h3>
              <div className="space-y-2">
                {completedSends.slice(0, 3).map((t) => (
                  <div key={t.transferId} className="flex items-center gap-4 border border-outline p-3">
                    <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                      t.status === "complete" ? "border border-primary text-primary" : "border border-outline text-on-surface-variant"
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {t.status === "complete" ? "check" : "close"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-xs truncate">{t.fileName}</p>
                      <p className="font-mono text-[10px] text-on-surface-variant">
                        {formatBytes(t.fileSize)} &bull; {t.peerName}
                      </p>
                    </div>
                    <span className={`font-mono text-[10px] font-bold uppercase ${t.status === "complete" ? "text-primary" : "text-error"}`}>
                      {t.status === "complete" ? "Done" : "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Stream Queue */}
        <div className="lg:w-2/3 border border-outline bg-surface p-6 md:p-8 flex flex-col relative overflow-hidden">
          {/* Decorative SVG */}
          <svg className="absolute right-[-20%] bottom-[-20%] w-[80%] h-auto opacity-[0.04] pointer-events-none text-on-surface-variant" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.5">
            <circle cx="100" cy="100" r="90" />
            <ellipse cx="100" cy="100" rx="90" ry="30" />
            <ellipse cx="100" cy="100" rx="90" ry="60" />
            <line x1="10" y1="100" x2="190" y2="100" />
            <line x1="100" y1="10" x2="100" y2="190" />
          </svg>

          <div className="mb-8 md:mb-12 flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tighter uppercase mb-2">Stream Queue</h2>
              <p className="font-mono text-[10px] text-on-surface-variant uppercase">
                {activeCount} Active Stream{activeCount !== 1 ? "s" : ""}
              </p>
            </div>
            {transfers.length > 0 && (
              <button onClick={clearAll} className="font-mono text-xs font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest">
                Clear
              </button>
            )}
          </div>

          <div className="space-y-6 flex-1 relative z-10">
            {transfers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">inventory_2</span>
                <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  No Active Transfers
                </h3>
                <p className="font-mono text-[10px] text-on-surface-variant">
                  Select a target device to initiate stream sequence
                </p>
              </div>
            ) : (
              transfers.map((transfer) => {
                const isStreaming = transfer.status === "transferring";
                const isConnecting = transfer.status === "pending" || transfer.status === "accepted";
                const isVerifying = transfer.status === "verifying";
                const isFailed = transfer.status === "failed";
                const isRejected = transfer.status === "rejected";
                const isComplete = transfer.status === "complete";
                const isError = isFailed || isRejected;

                return (
                  <div
                    key={transfer.transferId}
                    className={`border p-6 transition-colors ${
                      isError ? "border-primary bg-primary/5" :
                      isComplete ? "border-primary bg-primary/5" :
                      isStreaming ? "border-outline bg-surface-container-high" :
                      "border-outline"
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-10 h-10 border flex items-center justify-center transition-colors ${
                        isError ? "border-primary text-primary animate-shake" :
                        isComplete ? "bg-primary border-primary text-white animate-check-pop" :
                        isConnecting ? "border-outline text-on-surface-variant animate-kinetic-pulse" :
                        "border-outline text-primary"
                      }`}>
                        <span className="material-symbols-outlined text-xl">
                          {isError ? "close" :
                           isComplete ? "check" :
                           isVerifying ? "verified" :
                           transfer.direction === "send" ? "upload" : "download"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold uppercase tracking-tight">{transfer.fileName}</p>
                          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${
                            isError ? "text-primary" :
                            isComplete ? "text-primary" :
                            isStreaming ? "text-on-surface" :
                            "text-on-surface-variant"
                          }`}>
                            {isError ? (isRejected ? "Declined" : "Failed") :
                             isComplete ? "Complete" :
                             isStreaming ? `${transfer.progress}%` :
                             isVerifying ? "Verifying" :
                             isConnecting ? "Connecting" : transfer.status}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-on-surface-variant uppercase">
                          {transfer.peerName} &bull; {formatBytes(transfer.fileSize)}
                        </p>
                      </div>
                    </div>
                    <ProgressBar progress={transfer.progress} />
                    {isStreaming && transfer.speed > 0 && (
                      <div className="flex justify-between mt-3">
                        <span className="font-mono text-[10px] font-bold uppercase">
                          {formatBytes(transfer.bytesTransferred)} / {formatBytes(transfer.fileSize)}
                        </span>
                        <span className="font-mono text-[10px] font-bold uppercase">
                          {formatBytes(transfer.speed)}/s &bull; {Math.ceil(transfer.eta)}s
                        </span>
                      </div>
                    )}
                    {isError && transfer.errorMessage && (
                      <p className="font-mono text-xs text-primary mt-3">{transfer.errorMessage}</p>
                    )}
                  </div>
                );
              })
            )}

            {/* Queue more */}
            <DropZone
              title="Queue Artifacts"
              subtitle="Load payload for simultaneous broadcast."
              icon="add"
              onFilesSelected={handleQueueFiles}
            />
          </div>

          {/* Footer */}
          <div className="mt-8 md:mt-12 border-t border-outline pt-6 grid grid-cols-2 gap-8 relative z-10">
            <div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase mb-1">Total Velocity</div>
              <div className="font-mono text-2xl md:text-3xl font-bold tracking-tighter">
                {totalSpeed() > 0 ? `${formatBytes(totalSpeed())}/S` : "0 B/S"}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase mb-1">Protocol</div>
              <div className="font-mono text-2xl md:text-3xl font-bold text-primary tracking-tighter">WEBRTC-P2P</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
