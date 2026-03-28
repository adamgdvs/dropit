import { useState, useEffect } from "react";
import { useTransferContext } from "../context/TransferContext";
import { useDeviceStore } from "../stores/deviceStore";
import { useTransferStore } from "../stores/transferStore";
import { formatBytes } from "../services/files";
import DropZone from "../components/DropZone";
import PeerPicker from "../components/PeerPicker";

export default function Dashboard() {
  const { sendFiles } = useTransferContext();
  const isConnected = useDeviceStore((s) => s.isSignalingConnected);
  const peers = useDeviceStore((s) => s.deviceArray);
  const connected = useDeviceStore((s) => s.connectedArray);
  const activeArray = useTransferStore((s) => s.activeArray);
  const history = useTransferStore((s) => s.history);

  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  // Auto-select peer when there's exactly one connected device
  useEffect(() => {
    if (connected.length === 1) {
      setSelectedPeer(connected[0].id);
    } else if (connected.length === 0) {
      setSelectedPeer(null);
    }
  }, [connected]);

  const activeTransfer = activeArray.find(
    (t) => t.status === "transferring" || t.status === "pending" || t.status === "accepted"
  );
  const recentTransfers = history.slice(0, 5);

  const handleFilesSelected = (files: File[]) => {
    if (selectedPeer) {
      sendFiles(selectedPeer, files);
    } else if (connected.length === 1) {
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

  const handleDeviceClick = (deviceId: string) => {
    setSelectedPeer(selectedPeer === deviceId ? null : deviceId);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "phone":
      case "mobile":
        return "smartphone";
      case "tablet":
        return "tablet_mac";
      default:
        return "laptop_mac";
    }
  };

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="border-b border-outline pb-4">
          <h1 className="text-3xl font-black font-headline uppercase tracking-tight text-on-surface">Dashboard</h1>
          <p className="font-mono text-xs text-on-surface-variant mt-1">
            {isConnected ? `${connected.length} device${connected.length !== 1 ? "s" : ""} connected` : "Offline"}
          </p>
        </header>

        {/* Connected Devices */}
        {connected.length > 0 && (
          <section>
            <h2 className="text-sm font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Connected Devices
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {connected.map((device) => (
                <button
                  key={device.id}
                  onClick={() => handleDeviceClick(device.id)}
                  className={`p-4 border-l-2 text-left transition-all duration-200 ${
                    selectedPeer === device.id
                      ? "bg-primary/10 border-primary"
                      : "bg-surface-container-low border-transparent hover:border-primary/40 hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface-container-highest flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined ${selectedPeer === device.id ? "text-primary" : "text-on-surface-variant"}`}>
                        {getDeviceIcon(device.deviceType)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold font-headline uppercase truncate">{device.name}</p>
                      <p className="text-[10px] font-mono text-primary">Connected</p>
                    </div>
                  </div>
                  {selectedPeer === device.id && (
                    <p className="text-[10px] font-mono text-primary mt-2 uppercase">Selected — drop files to send</p>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Drop zone + recent transfers */}
          <div className="lg:col-span-2 space-y-6">
            <DropZone
              title="Quick Drop"
              subtitle={selectedPeer
                ? `Sending to ${connected.find(d => d.id === selectedPeer)?.name || "device"}`
                : connected.length > 0
                  ? "Drop files to send"
                  : "Tap PAIR above to connect a device"
              }
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
                              {t.status === "complete" ? "Done" : "Failed"}
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

          {/* Right: Active transfer sidebar */}
          <div className="space-y-6">
            {activeTransfer && (
              <section className="border border-outline p-4">
                <h2 className="text-sm font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  Active Transfer
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold truncate max-w-[160px]">{activeTransfer.fileName}</span>
                    <span className="font-mono text-[10px] text-primary font-bold">{activeTransfer.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-outline overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${activeTransfer.progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-on-surface-variant">
                    <span>{activeTransfer.direction === "send" ? "Sending" : "Receiving"}</span>
                    <span>{formatBytes(activeTransfer.bytesTransferred)} / {formatBytes(activeTransfer.fileSize)}</span>
                  </div>
                  {activeTransfer.speed > 0 && (
                    <p className="text-[10px] font-mono text-on-surface-variant">{formatBytes(activeTransfer.speed)}/s</p>
                  )}
                </div>
              </section>
            )}

            {/* No devices hint */}
            {connected.length === 0 && (
              <section className="border border-outline p-4 text-center">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 block mb-3">devices</span>
                <p className="font-mono text-xs text-on-surface-variant mb-1">No devices connected</p>
                <p className="font-mono text-[10px] text-on-surface-variant/50">
                  Tap PAIR above — create a code on this device, enter it on the other
                </p>
              </section>
            )}
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
