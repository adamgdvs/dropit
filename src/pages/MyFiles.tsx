import { useTransferContext } from "../context/TransferContext";
import { useDeviceStore } from "../stores/deviceStore";
import { useFileStore } from "../stores/fileStore";
import { useTransferStore } from "../stores/transferStore";
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
  const received = useFileStore((s) => s.received);
  const activeList = useTransferStore((s) => s.activeList);

  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const peers = deviceList();
  const connected = connectedDevices();
  const activeSends = activeList().filter((t) => t.direction === "send");

  const handleAddFiles = (files: File[]) => {
    addQueued(files);
  };

  const handleSendFile = (fileId: string) => {
    const item = queued.find((q) => q.id === fileId);
    if (!item) return;

    if (connected.length === 1) {
      sendFiles(connected[0].id, [item.file]);
      removeQueued(fileId);
    } else if (connected.length > 1) {
      setPendingFiles([item.file]);
    }
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
    if (type.startsWith("video/")) return "videocam";
    if (type.startsWith("audio/")) return "audio_file";
    if (type.includes("pdf")) return "picture_as_pdf";
    if (type.includes("zip") || type.includes("rar")) return "folder_zip";
    if (type.includes("spreadsheet") || type.includes("excel")) return "table_chart";
    return "description";
  };

  return (
    <div className="p-4 md:p-12">
      {/* Header */}
      <header className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b border-outline pb-8">
        <div>
          <p className="font-mono text-[10px] text-primary uppercase tracking-[0.3em] mb-2">
            // LOCAL_STORAGE
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase">
            My Files
          </h1>
          <p className="font-mono text-xs text-on-surface-variant mt-2">
            {queued.length} QUEUED &bull; {received.length} RECEIVED
          </p>
        </div>
        <div className="flex gap-3">
          {queued.length > 0 && (
            <>
              <button
                onClick={handleSendAll}
                className="bg-primary text-white font-mono text-xs uppercase px-6 py-2 hover:bg-primary-hover transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                Stream All ({queued.length})
              </button>
              <button
                onClick={clearQueued}
                className="border border-outline text-on-surface-variant font-mono text-xs uppercase px-4 py-2 hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                Purge
              </button>
            </>
          )}
        </div>
      </header>

      {/* File Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Queued Files */}
        {queued.map((item, i) => (
          <div key={item.id} className="border border-outline bg-surface flex flex-col group hover:border-primary transition-colors">
            {/* Preview */}
            <div className="h-36 bg-background border-b border-outline flex items-center justify-center relative">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all">
                {iconForType(item.file.type)}
              </span>
              <span className="absolute top-3 left-3 font-mono text-[10px] text-on-surface-variant">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            {/* Info */}
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-mono font-bold text-sm truncate mb-2">{item.file.name}</h3>
              <div className="font-mono text-[10px] text-on-surface-variant space-y-1 mb-4">
                <div className="flex justify-between">
                  <span>TYPE:</span>
                  <span className="text-on-surface">{item.file.type.split("/")[1]?.toUpperCase() || "FILE"}</span>
                </div>
                <div className="flex justify-between">
                  <span>SIZE:</span>
                  <span className="text-on-surface">{formatBytes(item.file.size)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => handleSendFile(item.id)}
                  className="flex-1 border border-primary text-primary font-mono font-bold text-[10px] uppercase py-2 hover:bg-primary hover:text-white transition-colors"
                >
                  Stream
                </button>
                <button
                  onClick={() => removeQueued(item.id)}
                  className="flex-1 border border-outline text-on-surface-variant font-mono text-[10px] uppercase py-2 hover:text-on-surface hover:border-on-surface transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Active Upload States */}
        {activeSends.map((transfer) => (
          <div key={transfer.transferId} className="border border-primary bg-surface p-6 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 border border-primary text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-base animate-pulse">sync</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] text-primary uppercase tracking-[0.2em]">
                  {transfer.status === "transferring" ? "STREAMING" : "CONNECTING"}
                </p>
                <h3 className="font-mono font-bold text-sm truncate">{transfer.fileName}</h3>
              </div>
            </div>
            <div className="w-full h-1 bg-outline overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${transfer.progress}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-mono text-[10px] text-on-surface-variant">
                {transfer.progress}%
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">
                {transfer.speed > 0 ? `${formatBytes(transfer.speed)}/s` : "..."}
              </span>
            </div>
          </div>
        ))}

        {/* Drop Zone */}
        <div className={`${queued.length === 0 && activeSends.length === 0 ? "sm:col-span-2 lg:col-span-4" : "sm:col-span-2 lg:col-span-3"}`}>
          <DropZone
            title="Push to Stream"
            subtitle="Drag files here or click to browse"
            icon="upload"
            onFilesSelected={handleAddFiles}
          />
        </div>
      </div>

      {/* Footer Stats */}
      <div className="mt-12 border-t border-outline pt-8 flex flex-wrap gap-8 font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em]">
        <div>
          <span>PROTOCOL:</span>
          <span className="text-on-surface ml-2">WebRTC-P2P</span>
        </div>
        <div>
          <span>PAYLOAD:</span>
          <span className="text-on-surface ml-2">{queued.length} ITEM{queued.length !== 1 ? "S" : ""}</span>
        </div>
        <div>
          <span>STATUS:</span>
          <span className="text-primary ml-2">{activeSends.length > 0 ? "STREAMING" : "IDLE"}</span>
        </div>
      </div>

      {/* Peer Picker */}
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
