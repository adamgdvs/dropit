import { useState } from "react";
import { useTransferContext } from "../context/TransferContext";
import { useDeviceStore } from "../stores/deviceStore";
import { useTransferStore } from "../stores/transferStore";
import { formatBytes } from "../services/files";
import DropZone from "../components/DropZone";
import DeviceCard from "../components/DeviceCard";
import PeerPicker from "../components/PeerPicker";

export default function Dashboard() {
  const { sendFiles } = useTransferContext();
  const isConnected = useDeviceStore((s) => s.isSignalingConnected);
  const deviceList = useDeviceStore((s) => s.deviceList);
  const connectedDevices = useDeviceStore((s) => s.connectedDevices);
  const history = useTransferStore((s) => s.history);

  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const peers = deviceList();
  const connected = connectedDevices();
  const recentTransfers = history.slice(0, 5);

  const handleFilesSelected = (files: File[]) => {
    if (connected.length === 1) {
      sendFiles(connected[0].id, files);
    } else if (connected.length > 1) {
      setPendingFiles(files);
    } else {
      // If offline or no peers, theoretically we prompt or store
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
    <div className="pt-12 min-h-screen">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header - Tactical Status */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-container-high pb-4">
          <div>
            <h1 className="text-3xl font-black font-headline uppercase tracking-tight text-primary">SYS_DASHBOARD</h1>
            <p className="font-mono text-xs text-secondary/60 mt-1">NODE_OP // v4.2.0-A</p>
          </div>
          <div className="flex gap-4">
            <div className="px-3 py-1 bg-surface-container-low border border-outline flex items-center gap-2">
              <span className={`w-2 h-2 ${isConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`}></span>
              <span className="font-mono text-[10px] uppercase font-bold text-secondary">
                {isConnected ? "Connection Secure" : "Signaling Offline"}
              </span>
            </div>
            <div className="px-3 py-1 bg-surface-container-low border border-outline flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-primary">encrypted</span>
              <span className="font-mono text-[10px] uppercase font-bold text-secondary">E2E Active</span>
            </div>
          </div>
        </header>

        {/* Dashboard Grid Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area (col 1-2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Storage Metrics Bento */}
            <section>
              <h2 className="text-sm font-headline font-bold uppercase tracking-widest text-secondary mb-3">Storage Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest p-4 border border-surface-container-high relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-surface-container flex items-center justify-center text-secondary border-b border-l border-surface-container-high">
                    <span className="material-symbols-outlined text-sm">hard_drive</span>
                  </div>
                  <p className="font-mono text-[10px] text-secondary/60 mb-2 mt-4">CAPACITY</p>
                  <p className="font-headline font-black text-2xl text-on-surface">74<span className="text-sm text-primary">%</span></p>
                  <div className="w-full h-1 bg-surface-container-high mt-3"><div className="w-[74%] h-full bg-primary relative"><div className="absolute right-0 top-0 bottom-0 w-1 bg-white opacity-50"></div></div></div>
                </div>
                <div className="bg-surface-container-lowest p-4 border border-surface-container-high">
                  <p className="font-mono text-[10px] text-secondary/60 mb-2">VELOCITY</p>
                  <p className="font-headline font-black text-2xl text-on-surface">840<span className="text-sm text-secondary">Mbps</span></p>
                </div>
                <div className="bg-surface-container-lowest p-4 border border-surface-container-high">
                  <p className="font-mono text-[10px] text-secondary/60 mb-2">TUNNELS</p>
                  <p className="font-headline font-black text-2xl text-primary">{connected.length}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 border border-surface-container-high">
                  <p className="font-mono text-[10px] text-secondary/60 mb-2">UPTIME</p>
                  <p className="font-headline font-black text-xl text-on-surface mt-1">99.9<span className="text-sm text-secondary">%</span></p>
                </div>
              </div>
            </section>

            {/* Quick Drop */}
            <DropZone 
              title="Quick Drop"
              subtitle=""
              variant="primary"
              onFilesSelected={handleFilesSelected}
            />

            {/* Recent Stream */}
            <section>
              <div className="flex items-center justify-between mb-4 mt-8">
                <h2 className="text-sm font-headline font-bold uppercase tracking-widest text-secondary">Recent Stream</h2>
                <button className="text-[10px] font-mono text-primary hover:underline underline-offset-4 uppercase">View Archive →</button>
              </div>
              <div className="bg-surface-container-lowest border border-surface-container-high overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-container-high">
                      <th className="font-mono text-[10px] text-secondary/50 font-normal py-3 px-4 uppercase tracking-widest">Hash / Name</th>
                      <th className="font-mono text-[10px] text-secondary/50 font-normal py-3 px-4 uppercase tracking-widest">Size</th>
                      <th className="font-mono text-[10px] text-secondary/50 font-normal py-3 px-4 uppercase tracking-widest">Node Path</th>
                      <th className="font-mono text-[10px] text-secondary/50 font-normal py-3 px-4 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransfers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 px-4 text-center text-sm font-mono text-secondary/40">NO RECENT TRANSFERS EXTRACTED</td>
                      </tr>
                    ) : (
                      recentTransfers.map((t) => (
                        <tr key={t.transferId} className="border-b border-surface-container-high/50 hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-secondary/50 text-[18px]">draft</span>
                              <div>
                                <p className="font-headline text-sm font-bold text-on-surface truncate max-w-[150px]">{t.fileName}</p>
                                <p className="font-mono text-[9px] text-secondary/40">{(t.transferId || "").substring(0,8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-secondary">{formatBytes(t.fileSize)}</td>
                          <td className="py-3 px-4 font-mono text-[10px] text-primary bg-primary/5 uppercase tracking-wider">{t.peerName}</td>
                          <td className="py-3 px-4 text-right">
                            {t.status === "complete" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-green-500 bg-green-500/10 px-2 py-1 uppercase font-bold">
                                <span className="w-1 h-1 bg-green-500"></span> SECURED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-500 bg-red-500/10 px-2 py-1 uppercase font-bold">
                                <span className="w-1 h-1 bg-red-500"></span> FAILED
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right Sidebar Area (col 3) */}
          <div className="space-y-6">
            <section className="bg-surface-container-low border border-surface-container-high p-4 relative corner-marks">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-headline font-bold uppercase tracking-widest text-secondary">Linked Nodes</h2>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(255,81,58,0.6)]"></div>
              </div>
              <div className="space-y-3">
                {peers.map((peer) => (
                  <DeviceCard key={peer.id} device={peer as any} onClick={() => {}} />
                ))}
                {peers.length === 0 && (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-3xl text-secondary/30 mb-2">radar</span>
                    <p className="font-mono text-xs text-secondary/50 uppercase">Scanning Frequencies...</p>
                  </div>
                )}
              </div>
            </section>
          </div>

        </div>
      </div>

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
