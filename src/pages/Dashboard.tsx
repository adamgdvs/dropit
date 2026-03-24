import { useState } from "react";
import { useTransferContext } from "../context/TransferContext";
import { useDeviceStore } from "../stores/deviceStore";
import { useTransferStore } from "../stores/transferStore";
import { formatBytes } from "../services/files";
import DropZone from "../components/DropZone";
import PeerPicker from "../components/PeerPicker";
import { storageStats } from "../data/mock";

export default function Dashboard() {
  const { sendFiles } = useTransferContext();
  const isConnected = useDeviceStore((s) => s.isSignalingConnected);
  const deviceList = useDeviceStore((s) => s.deviceList);
  const connectedDevices = useDeviceStore((s) => s.connectedDevices);
  const activeList = useTransferStore((s) => s.activeList);

  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const peers = deviceList();
  const connected = connectedDevices();
  const activeTransfer = activeList().find(
    (t) => t.status === "transferring" || t.status === "pending" || t.status === "accepted"
  );
  const percentUsed = Math.round((storageStats.used / storageStats.total) * 100);

  const handleFilesSelected = (files: File[]) => {
    if (connected.length === 1) {
      sendFiles(connected[0].id, files);
    } else if (connected.length > 1) {
      setPendingFiles(files);
    }
  };

  const handlePeerSelect = (peerId: string) => {
    if (pendingFiles) {
      sendFiles(peerId, pendingFiles);
      setPendingFiles(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Left Column — Main content */}
      <div className="flex-1 lg:w-2/3 bg-surface p-6 md:p-12 flex flex-col relative overflow-hidden">
        {/* Decorative radar SVG */}
        <svg className="absolute right-[-10%] top-[-10%] w-[80%] h-auto opacity-[0.06] pointer-events-none text-on-surface-variant" viewBox="0 0 500 500" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="250" cy="250" r="200" />
          <circle cx="250" cy="250" r="150" />
          <circle cx="250" cy="250" r="100" />
          <circle cx="250" cy="250" r="50" />
          <line x1="250" y1="0" x2="250" y2="500" />
          <line x1="0" y1="250" x2="500" y2="250" />
          <line x1="73" y1="73" x2="427" y2="427" />
          <line x1="73" y1="427" x2="427" y2="73" />
        </svg>

        {/* Header */}
        <header className="mb-8 md:mb-12 relative z-10">
          <h1 className="text-6xl md:text-[7rem] font-bold tracking-tighter leading-[0.85] mb-6 uppercase">
            Op /<br />Board
          </h1>
          <p className="font-mono font-bold text-sm uppercase max-w-md border-l-2 border-on-surface dark:border-primary pl-4 text-on-surface-variant">
            Instant file synchronization across your kinetic network.
          </p>
        </header>

        {/* Quick Drop Zone */}
        <div className="flex-1 relative z-10">
          <DropZone
            title="Quick Drop"
            subtitle="Drag and drop files here to broadcast to all linked devices instantly."
            icon="upload"
            action="Select Files"
            variant="primary"
            className="h-full"
            onFilesSelected={handleFilesSelected}
          />
        </div>

        {/* Recent Stream */}
        <div className="mt-8 md:mt-12 border-t-2 border-on-surface dark:border-outline pt-6 z-10 relative">
          <div className="flex justify-between items-end mb-4">
            <h3 className="font-bold text-xl uppercase tracking-tight">Recent Stream</h3>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:underline cursor-pointer">
              Full History →
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4 h-28 md:h-32">
            {["image", "description", "videocam", "inventory_2"].map((icon, i) => (
              <div
                key={i}
                className="border border-on-surface dark:border-outline flex items-center justify-center relative hover:bg-on-surface hover:text-primary dark:hover:bg-surface-variant transition-colors group cursor-pointer"
              >
                <span className="absolute top-2 left-2 font-mono text-[8px] font-bold text-on-surface-variant">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="material-symbols-outlined text-2xl opacity-50 group-hover:opacity-100 transition-opacity">
                  {icon}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column — System panels */}
      <div className="lg:w-1/3 bg-background border-l border-outline p-6 md:p-12 flex flex-col overflow-y-auto">
        {/* Network Status */}
        <div className="border border-outline p-6 mb-8 md:mb-12 relative corner-marks">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 flex items-center justify-center ${isConnected ? "bg-primary text-white" : "border border-outline text-on-surface-variant"}`}>
              <span className="material-symbols-outlined">
                {isConnected ? "sync_alt" : "sync_disabled"}
              </span>
            </div>
            <div>
              <div className="font-mono text-[10px] text-on-surface-variant tracking-widest uppercase mb-1">Network Status</div>
              <div className="text-xl font-bold tracking-widest uppercase">
                {isConnected ? "Connected" : "Offline"}
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mb-8 md:mb-12">
          <h3 className="text-xl font-bold tracking-wide mb-6 uppercase border-b border-outline pb-4">System Status</h3>
          <ul className="font-mono text-xs text-on-surface-variant space-y-3">
            <li className="flex items-center justify-between"><span className="text-on-surface">01. KINETIC CORE</span> <span>{isConnected ? "ONLINE" : "OFFLINE"}</span></li>
            <li className="flex items-center justify-between"><span className="text-on-surface">02. WEBRTC MESH</span> <span>{isConnected ? "ACTIVE" : "IDLE"}</span></li>
            <li className="flex items-center justify-between"><span className="text-on-surface">03. LOCAL STORAGE</span> <span className="text-primary font-bold">{percentUsed}% FULL</span></li>
            <li className="flex items-center justify-between"><span className="text-on-surface">04. ENCRYPTION</span> <span>AES-256</span></li>
            <li className="flex items-center justify-between"><span className="text-on-surface">05. FIREWALL</span> <span>PASSTHROUGH</span></li>
            <li className="flex items-center justify-between"><span className="text-on-surface">06. DISCOVERY</span> <span>{isConnected ? "BROADCASTING" : "DISABLED"}</span></li>
          </ul>
        </div>

        {/* Storage Matrix */}
        <div className="mb-8 md:mb-12">
          <h3 className="text-xl font-bold tracking-wide mb-6 uppercase border-b border-outline pb-4">Storage Matrix</h3>
          <div className="flex justify-between font-mono text-xs mb-2">
            <span className="text-primary font-bold">{percentUsed}% CAPACITY</span>
            <span className="text-on-surface-variant">{storageStats.used} GB / {storageStats.total / 1000} TB</span>
          </div>
          <div className="h-2 w-full bg-surface-variant mb-6 flex">
            <div className="h-full bg-primary" style={{ width: `${percentUsed}%` }} />
          </div>
          <ul className="font-mono text-[10px] space-y-2 text-on-surface-variant">
            {storageStats.breakdown.map((item) => (
              <li key={item.label} className="flex justify-between">
                <span>{item.label.toUpperCase()}</span>
                <span className="text-on-surface">{item.size}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Linked Devices */}
        <div>
          <div className="flex justify-between items-end mb-6 border-b border-outline pb-4">
            <h3 className="text-xl font-bold tracking-wide uppercase">Linked Devices</h3>
            <span className={`font-mono text-[10px] font-bold px-2 py-1 ${
              connected.length > 0 ? "bg-primary text-white" : "border border-outline text-on-surface-variant"
            }`}>
              {connected.length} LIVE
            </span>
          </div>
          <div className="space-y-3">
            {peers.length === 0 ? (
              <p className="font-mono text-xs text-on-surface-variant py-4 text-center">
                No devices nearby.
              </p>
            ) : (
              peers.map((peer) => (
                <div
                  key={peer.id}
                  className={`border p-4 flex items-center gap-4 transition-colors cursor-pointer ${
                    peer.connectionState === "connected"
                      ? "border-outline bg-surface hover:border-primary"
                      : "border-outline opacity-40"
                  }`}
                >
                  <span className="material-symbols-outlined text-primary">
                    {peer.deviceType === "phone" ? "smartphone" : peer.deviceType === "tablet" ? "tablet_mac" : "laptop_mac"}
                  </span>
                  <div>
                    <div className="font-bold text-sm tracking-wide uppercase">{peer.name}</div>
                    <div className="font-mono text-[10px] text-primary uppercase mt-1">
                      {peer.connectionState === "connected" ? "Active" : "Connecting..."}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Status Bar */}
      {activeTransfer && (
        <div className={`fixed bottom-6 right-6 md:bottom-6 md:right-6 flex items-center gap-4 px-6 py-4 border animate-slide-in z-50 ${
          activeTransfer.status === "failed" ? "bg-primary text-white border-primary" :
          "bg-on-surface text-background border-on-surface dark:bg-surface dark:text-on-surface dark:border-outline"
        }`}>
          <span className={`material-symbols-outlined ${activeTransfer.status === "failed" ? "" : "animate-spin"}`}>
            {activeTransfer.status === "failed" ? "error" : activeTransfer.status === "complete" ? "check" : "sync"}
          </span>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest leading-none">
              {activeTransfer.status === "failed" ? "Failed" :
               activeTransfer.status === "complete" ? "Complete" :
               activeTransfer.direction === "send" ? "Sending" : "Receiving"}
            </span>
            <span className="text-sm font-bold truncate max-w-[180px]">{activeTransfer.fileName}</span>
          </div>
          {activeTransfer.status !== "failed" && activeTransfer.status !== "complete" && (
            <div className="flex flex-col items-end gap-1">
              <div className="w-20 h-1 bg-on-surface-variant/20 overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${activeTransfer.progress}%` }} />
              </div>
              <span className="font-mono text-[10px] font-bold">
                {activeTransfer.progress}% &bull; {formatBytes(activeTransfer.speed)}/s
              </span>
            </div>
          )}
        </div>
      )}

      {pendingFiles && (
        <PeerPicker
          peers={peers}
          files={pendingFiles}
          onSelect={handlePeerSelect}
          onCancel={() => setPendingFiles(null)}
        />
      )}
    </div>
  );
}
