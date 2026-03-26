import { useTransferContext } from "../context/TransferContext";
import { useDeviceStore } from "../stores/deviceStore";
import { useFileStore } from "../stores/fileStore";
import { formatBytes } from "../services/files";
import DropZone from "../components/DropZone";
import PeerPicker from "../components/PeerPicker";
import { useState } from "react";

export default function MyFiles() {
  const { sendFiles } = useTransferContext();
  const deviceList = useDeviceStore((s) => s.deviceList);
  const connectedDevices = useDeviceStore((s) => s.connectedDevices);
  const queued = useFileStore((s) => s.queued);
  const addQueued = useFileStore((s) => s.addQueued);
  const removeQueued = useFileStore((s) => s.removeQueued);
  const clearQueued = useFileStore((s) => s.clearQueued);

  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const peers = deviceList();
  const connected = connectedDevices();

  const handleAddFiles = (files: File[]) => {
    addQueued(files);
  };

  const handleSendAll = () => {
    const files = queued.map((q) => q.file);
    if (connected.length === 1) {
      sendFiles(connected[0].id, files);
      clearQueued();
    } else if (connected.length > 1) {
      setPendingFiles(files);
    }
  };

  const handlePeerSelect = (peerId: string) => {
    if (pendingFiles) {
      sendFiles(peerId, pendingFiles);
      clearQueued();
      setPendingFiles(null);
    }
  };

  const iconForType = (type: string): string => {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video_file";
    if (type.startsWith("audio/")) return "audio_file";
    if (type.includes("pdf")) return "picture_as_pdf";
    if (type.includes("zip") || type.includes("rar")) return "folder_zip";
    return "description";
  };

  return (
    <div className="md:pl-64 pt-20 p-6 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-container-highest pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tighter uppercase text-on-surface">Archive Registry</h1>
            <p className="text-secondary font-label text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              LOCAL NODE ACTIVE // ENCRYPTION LAYER 7
            </p>
          </div>
          <div className="flex gap-2">
            {queued.length > 0 && (
              <button onClick={handleSendAll} className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                Stream All
              </button>
            )}
            <button onClick={clearQueued} className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                Purge
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Activity Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Drag and Drop */}
            <DropZone
              title="Push to Stream"
              subtitle="DRAG FILES HERE TO BEGIN ASYNCHRONOUS ENCRYPTED TRANSMISSION"
              onFilesSelected={handleAddFiles}
            />

            {/* File List Table */}
            <section className="bg-surface-container-low rounded-sm overflow-hidden border border-surface-container-highest">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-high text-secondary text-[10px] font-bold uppercase tracking-widest">
                      <th className="px-6 py-4">Filename</th>
                      <th className="px-6 py-4 hidden md:table-cell">Format</th>
                      <th className="px-6 py-4">Size</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-body">
                    {queued.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-xs font-mono text-secondary">
                          NO FILES IN REGISTRY
                        </td>
                      </tr>
                    ) : (
                      queued.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-container-highest/50 transition-colors border-b border-surface-container-highest/30">
                          <td className="px-6 py-4 text-on-surface font-medium flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-lg">{iconForType(item.file.type)}</span>
                            <span className="truncate max-w-[150px] md:max-w-xs">{item.file.name}</span>
                          </td>
                          <td className="px-6 py-4 text-secondary hidden md:table-cell text-xs uppercase font-mono">
                            {item.file.type.split("/")[1] || "FILE"}
                          </td>
                          <td className="px-6 py-4 text-secondary text-xs font-mono">{formatBytes(item.file.size)}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => removeQueued(item.id)} className="text-secondary hover:text-primary transition-colors">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Side Panel: Storage Metrics */}
          <aside className="space-y-6">
            <section className="bg-surface-container-low p-6 rounded-sm border-t-2 border-primary">
              <h3 className="font-headline text-sm font-bold tracking-widest uppercase text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Storage Metrics
              </h3>
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">Queued Volume</label>
                    <span className="text-xs font-mono text-on-surface font-bold">
                       {formatBytes(queued.reduce((acc, q) => acc + q.file.size, 0))}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-surface-container-highest">
                    <div className="h-full bg-primary" style={{ width: queued.length > 0 ? "40%" : "0%" }}></div>
                  </div>
                </div>
              </div>
            </section>
            
            <section className="bg-surface-container-low p-6 rounded-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2">
                <span className="material-symbols-outlined text-surface-container-highest group-hover:text-primary/20 text-6xl transition-colors">security</span>
              </div>
              <div className="relative z-10">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Security Status</h4>
                <p className="text-xs text-on-surface font-body font-light leading-relaxed">
                  Node is operating in <span className="font-bold">Stealth Mode</span>. Data is encrypted end-to-end via WebRTC protocol.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="bg-surface-container-highest px-2 py-0.5 text-[8px] font-mono text-secondary uppercase tracking-tighter">P2P-SECURE</span>
                </div>
              </div>
            </section>
          </aside>

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
