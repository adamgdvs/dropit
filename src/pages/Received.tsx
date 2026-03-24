import { useFileStore } from "../stores/fileStore";
import { useTransferStore } from "../stores/transferStore";
import { formatBytes, downloadBlob } from "../services/files";

export default function Received() {
  const received = useFileStore((s) => s.received);
  const clearReceived = useFileStore((s) => s.clearReceived);
  const removeReceived = useFileStore((s) => s.removeReceived);
  const history = useTransferStore((s) => s.history);

  const receivedTransfers = history.filter((t) => t.direction === "receive");

  const iconForType = (type: string): string => {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "videocam";
    if (type.startsWith("audio/")) return "audio_file";
    if (type.includes("pdf")) return "picture_as_pdf";
    if (type.includes("zip") || type.includes("rar") || type.includes("tar")) return "folder_zip";
    if (type.includes("spreadsheet") || type.includes("excel")) return "table_chart";
    return "description";
  };

  const formatTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}M AGO`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}H AGO`;
    return `${Math.floor(diff / 86400000)}D AGO`;
  };

  return (
    <div className="p-4 md:p-12">
      {/* Header */}
      <header className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b border-outline pb-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase">Received Data</h1>
        <div className="flex gap-3">
          {received.length > 0 && (
            <button
              onClick={clearReceived}
              className="border border-outline text-on-surface font-mono text-xs uppercase px-6 py-2 hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Purge All
            </button>
          )}
          <button className="bg-surface-variant border border-outline text-on-surface font-mono font-bold text-xs uppercase px-6 py-2 hover:border-primary hover:text-primary transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">arrow_upward</span>
            Latest First
          </button>
        </div>
      </header>

      {/* File Grid */}
      {received.length === 0 ? (
        <div className="border border-outline p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4">inbox</span>
          <h3 className="font-bold text-xl uppercase tracking-tight text-on-surface-variant mb-2">
            No Data Received
          </h3>
          <p className="font-mono text-xs text-on-surface-variant max-w-md mx-auto">
            Incoming file transfers will materialize here. Open DropIt on another device to begin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
          {received.map((file) => (
            <div key={file.id} className="border border-outline bg-surface flex flex-col">
              {/* Preview area */}
              <div className="h-48 bg-background border-b border-outline flex items-center justify-center relative group">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant opacity-50 group-hover:text-primary group-hover:opacity-100 transition-all">
                  {iconForType(file.type)}
                </span>
                <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-5 transition-opacity" />
              </div>
              {/* Info */}
              <div className="p-6">
                <h3 className="font-mono font-bold text-sm truncate mb-2">{file.name}</h3>
                <div className="font-mono text-[10px] text-on-surface-variant space-y-1 mb-6">
                  <div className="flex justify-between">
                    <span>ORIGIN:</span>
                    <span className="text-primary font-bold">{file.from.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SIZE:</span>
                    <span className="text-on-surface">{formatBytes(file.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TIME:</span>
                    <span className="text-on-surface">{formatTime(file.timestamp)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadBlob(file.blob, file.name)}
                    className="flex-1 border border-primary text-primary font-mono font-bold text-[10px] uppercase py-2 hover:bg-primary hover:text-white transition-colors"
                  >
                    Extract
                  </button>
                  <button
                    onClick={() => removeReceived(file.id)}
                    className="flex-1 border border-outline text-on-surface-variant font-mono text-[10px] uppercase py-2 hover:text-on-surface hover:border-on-surface transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Operation Log */}
      {receivedTransfers.length > 0 && (
        <div className="border border-outline bg-surface p-6 md:p-8">
          <h3 className="font-bold text-xl tracking-wide uppercase mb-8 flex items-center gap-3">
            <span className="material-symbols-outlined">schedule</span>
            Operation Log
          </h3>
          <div className="border-t border-outline">
            {receivedTransfers.slice(0, 10).map((t) => (
              <div key={t.transferId} className="flex items-center justify-between py-4 border-b border-outline hover:bg-background transition-colors px-4 -mx-4 group">
                <div className="flex items-center gap-6">
                  <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                    t.status === "complete" ? "border border-primary text-primary" : "border border-outline text-on-surface-variant"
                  }`}>
                    <span className="material-symbols-outlined text-base">
                      {t.status === "complete" ? "download" : "close"}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-mono font-bold text-sm group-hover:text-primary transition-colors">{t.fileName}</h4>
                    <p className="font-mono text-[10px] text-on-surface-variant mt-1">
                      {formatBytes(t.fileSize)} &bull; FROM: {t.peerName.toUpperCase()}
                    </p>
                    {t.errorMessage && (
                      <p className="font-mono text-[10px] text-primary mt-1">{t.errorMessage}</p>
                    )}
                  </div>
                </div>
                <div className={`font-mono text-[10px] font-bold tracking-widest uppercase ${
                  t.status === "complete" ? "text-primary" : "text-on-surface-variant"
                }`}>
                  {t.status === "complete" ? "Complete" : "Failed"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
