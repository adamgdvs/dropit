import { useTransferContext } from "../context/TransferContext";
import { useDeviceStore } from "../stores/deviceStore";
import { useFileStore } from "../stores/fileStore";
import { useTransferStore } from "../stores/transferStore";
import { formatBytes } from "../services/files";
import DropZone from "../components/DropZone";
import PeerPicker from "../components/PeerPicker";
import { useState } from "react";

export default function Send() {
  const { sendFiles } = useTransferContext();
  const peers = useDeviceStore((s) => s.deviceArray);
  const connected = useDeviceStore((s) => s.connectedArray);
  const queued = useFileStore((s) => s.queued);
  const addQueued = useFileStore((s) => s.addQueued);
  const removeQueued = useFileStore((s) => s.removeQueued);
  const clearQueued = useFileStore((s) => s.clearQueued);
  const activeArray = useTransferStore((s) => s.activeArray);

  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const transfers = activeArray;

  // Add files to the staging queue
  const handleAddFiles = (files: File[]) => {
    addQueued(files);
  };

  // Send all queued files
  const handleSendAll = () => {
    const files = queued.map((q) => q.file);
    if (files.length === 0) return;

    if (selectedPeer) {
      sendFiles(selectedPeer, files);
      clearQueued();
    } else if (connected.length === 1) {
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
    <div className="pt-12 px-4 md:px-6 pb-6 min-h-screen">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── Main Column ── */}
        <div className="flex-1 lg:max-w-4xl space-y-6">

          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-container-highest pb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tighter uppercase text-on-surface">Send Files</h1>
              <p className="text-secondary font-mono text-[10px] uppercase tracking-widest mt-2">
                {connected.length} device{connected.length !== 1 ? "s" : ""} connected &bull; {queued.length} queued
              </p>
            </div>
            <div className="flex gap-2">
              {queued.length > 0 && (
                <button onClick={handleSendAll} className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  Stream All
                </button>
              )}
              {queued.length > 0 && (
                <button onClick={clearQueued} className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">delete_sweep</span>
                  Purge
                </button>
              )}
            </div>
          </header>

          {/* Nearby Devices */}
          <section>
            <h2 className="font-headline text-sm font-medium text-secondary uppercase tracking-[0.2em] mb-4">Nearby Devices</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {connected.length === 0 ? (
                <div className="col-span-full border border-surface-container-highest p-8 text-center text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-2 block">radar</span>
                  <p className="font-mono text-sm uppercase">Scanning for nodes...</p>
                  <p className="font-mono text-[10px] mt-1">Open DropIt on another device</p>
                </div>
              ) : (
                connected.map((device) => (
                  <div
                    key={device.id}
                    onClick={() => setSelectedPeer(device.id)}
                    className={`bg-surface-container-low p-5 flex items-center gap-4 cursor-pointer transition-all duration-300 border-l-2
                      ${selectedPeer === device.id ? "bg-surface-container-high border-primary" : "border-transparent hover:bg-surface-container hover:border-surface-container-highest"}
                    `}
                  >
                    <div className="w-10 h-10 bg-surface-container-highest flex items-center justify-center rounded-sm shrink-0">
                      <span className="material-symbols-outlined text-primary">
                        {device.deviceType === "phone" ? "smartphone" : device.deviceType === "tablet" ? "tablet_mac" : "laptop_mac"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-headline font-bold text-on-surface text-sm tracking-tight uppercase truncate">{device.name}</h3>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{device.deviceType} Node</p>
                    </div>
                    {selectedPeer === device.id && (
                      <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Drop Zone */}
          <DropZone
            title="Drop Files Here"
            subtitle="Files will be added to the queue below"
            onFilesSelected={handleAddFiles}
          />

          {/* Queued Files Table */}
          {queued.length > 0 && (
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
                  <tbody className="text-sm">
                    {queued.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-container-highest/50 transition-colors border-b border-surface-container-highest/30">
                        <td className="px-6 py-4 text-on-surface font-medium">
                          <div className="flex items-center gap-3">
                            {item.previewUrl && item.file.type.startsWith("image/") ? (
                              <img
                                src={item.previewUrl}
                                alt={item.file.name}
                                className="w-10 h-10 object-cover border border-surface-container-highest shrink-0"
                              />
                            ) : item.previewUrl && item.file.type.startsWith("video/") ? (
                              <video
                                src={item.previewUrl}
                                className="w-10 h-10 object-cover border border-surface-container-highest shrink-0"
                                muted
                                preload="metadata"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-primary text-lg w-10 h-10 flex items-center justify-center bg-surface-container-high shrink-0">{iconForType(item.file.type)}</span>
                            )}
                            <span className="truncate max-w-[150px] md:max-w-xs">{item.file.name}</span>
                          </div>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* ── Stream Queue Sidebar ── */}
        <aside className="lg:w-80 bg-surface-container border border-surface-container-highest p-6 relative lg:sticky lg:top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="mb-8">
            <h2 className="font-headline text-sm font-bold text-on-surface uppercase tracking-widest">Stream Queue</h2>
            <div className="h-[2px] w-12 bg-primary mt-2"></div>
          </div>

          <div className="space-y-8 pr-2">
            {transfers.length === 0 ? (
              <div className="text-center text-secondary/50 font-mono text-xs py-8">
                NO ACTIVE STREAMS
              </div>
            ) : (
              transfers.map((transfer) => {
                const isStreaming = transfer.status === "transferring";
                return (
                  <div key={transfer.transferId} className={`space-y-3 ${transfer.status === "failed" ? "opacity-50" : ""}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${transfer.status === "failed" ? "text-red-500" : "text-primary"}`}>{transfer.status}</span>
                        <span className="text-xs font-bold font-headline text-on-surface truncate max-w-[120px]">{transfer.fileName}</span>
                      </div>
                      <span className="text-[10px] font-headline font-bold text-secondary">
                        {isStreaming && transfer.speed > 0 ? `${formatBytes(transfer.speed)}/s` : ""}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-surface-container-highest">
                      <div className={`h-full ${transfer.status === "failed" ? "bg-red-500" : "bg-primary"} transition-all`} style={{ width: `${transfer.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-secondary">
                      <span>{transfer.progress}%</span>
                      <span>{formatBytes(transfer.bytesTransferred)} / {formatBytes(transfer.fileSize)}</span>
                    </div>
                  </div>
                );
              })
            )}

            {transfers.length > 0 && (
              <div className="mt-8 pt-4 border-t border-surface-container-highest">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-secondary uppercase font-bold tracking-widest">Speed</span>
                  <span className="text-[10px] font-headline text-primary font-bold">{formatBytes(activeArray.reduce((sum, t) => sum + t.speed, 0))}/s</span>
                </div>
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* Peer Picker Modal */}
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
