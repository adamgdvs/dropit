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
  const activeList = useTransferStore((s) => s.activeList);
  const history = useTransferStore((s) => s.history);

  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const peers = deviceList();
  const connected = connectedDevices();
  const activeTransfer = activeList().find(
    (t) => t.status === "transferring" || t.status === "pending" || t.status === "accepted"
  );
  const recentTransfers = history.slice(0, 5);

  const handleFilesSelected = (files: File[]) => {
    if (connected.length === 1) {
      sendFiles(connected[0].id, files);
    } else if (connected.length > 1) {
      setPendingFiles(files);
    } else {
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
    <div className="min-h-screen">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline pb-4">
          <div>
            <h1 className="text-3xl font-black font-headline uppercase tracking-tight text-on-surface">Dashboard</h1>
            <p className="font-mono text-xs text-on-surface-variant mt-1">
              {isConnected ? `${connected.length} device${connected.length !== 1 ? "s" : ""} connected` : "Offline"}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="px-3 py-1 border border-outline flex items-center gap-2">
              <span className={`w-2 h-2 ${isConnected ? "bg-primary" : "bg-on-surface-variant"}`} />
              <span className="font-mono text-[10px] uppercase font-bold text-on-surface-variant">
                {isConnected ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Drop zone + recent transfers */}
          <div className="lg:col-span-2 space-y-6">
            <DropZone
              title="Quick Drop"
              subtitle=""
              variant="primary"
              onFilesSelected={handleFilesSelected}
            />

            {/* Recent Transfers */}
            {recentTransfers.length > 0 && (
              <section>
                <h2 className="text-sm font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  Recent Transfers
                </h2>
                <div className="border border-outline overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline">
                        <th className="font-mono text-[10px] text-on-surface-variant font-normal py-3 px-4 uppercase tracking-widest">File</th>
                        <th className="font-mono text-[10px] text-on-surface-variant font-normal py-3 px-4 uppercase tracking-widest">Size</th>
                        <th className="font-mono text-[10px] text-on-surface-variant font-normal py-3 px-4 uppercase tracking-widest">Peer</th>
                        <th className="font-mono text-[10px] text-on-surface-variant font-normal py-3 px-4 uppercase tracking-widest text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransfers.map((t) => (
                        <tr key={t.transferId} className="border-b border-outline/50 hover:bg-surface-variant/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">draft</span>
                              <span className="font-headline text-sm font-bold text-on-surface truncate max-w-[200px]">{t.fileName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">{formatBytes(t.fileSize)}</td>
                          <td className="py-3 px-4 font-mono text-[10px] text-primary uppercase tracking-wider">{t.peerName}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-1 ${
                              t.status === "complete"
                                ? "text-primary bg-primary/10"
                                : "text-on-surface-variant bg-surface-variant/30"
                            }`}>
                              <span className={`w-1 h-1 ${t.status === "complete" ? "bg-primary" : "bg-on-surface-variant"}`} />
                              {t.status === "complete" ? "DONE" : "FAILED"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          {/* Right: Devices panel */}
          <div className="space-y-6">
            <section className="border border-outline p-4">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline">
                <h2 className="text-sm font-headline font-bold uppercase tracking-widest text-on-surface-variant">Devices</h2>
                <span className={`font-mono text-[10px] font-bold px-2 py-1 ${
                  connected.length > 0 ? "bg-primary text-white" : "border border-outline text-on-surface-variant"
                }`}>
                  {connected.length} LIVE
                </span>
              </div>
              <div className="space-y-2">
                {peers.map((peer) => (
                  <DeviceCard key={peer.id} device={peer as any} onClick={() => {}} />
                ))}
                {peers.length === 0 && (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2 block">devices</span>
                    <p className="font-mono text-xs text-on-surface-variant">No devices nearby</p>
                    <p className="font-mono text-[10px] text-on-surface-variant/60 mt-1">
                      Use PAIR to connect manually
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Floating transfer status */}
      {activeTransfer && (
        <div className="fixed bottom-6 right-6 flex items-center gap-4 px-6 py-4 border bg-surface border-outline z-50 shadow-lg">
          <span className="material-symbols-outlined animate-spin text-primary">sync</span>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {activeTransfer.direction === "send" ? "Sending" : "Receiving"}
            </span>
            <span className="text-sm font-bold truncate max-w-[180px]">{activeTransfer.fileName}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="w-20 h-1 bg-outline overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${activeTransfer.progress}%` }} />
            </div>
            <span className="font-mono text-[10px] font-bold text-on-surface-variant">{activeTransfer.progress}%</span>
          </div>
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
