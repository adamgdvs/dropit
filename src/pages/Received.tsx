import { useFileStore } from "../stores/fileStore";
import { formatBytes, downloadBlob } from "../services/files";

export default function Received() {
  const received = useFileStore((s) => s.received);
  const clearReceived = useFileStore((s) => s.clearReceived);
  const removeReceived = useFileStore((s) => s.removeReceived);

  const iconForType = (type: string): string => {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video_file";
    if (type.startsWith("audio/")) return "audio_file";
    if (type.includes("pdf")) return "picture_as_pdf";
    if (type.includes("zip") || type.includes("rar") || type.includes("tar")) return "folder_zip";
    return "description";
  };

  const formatTime = (timestamp: number): string => {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="pt-12 p-4 md:p-6 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-container-highest pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tighter uppercase text-on-surface">Extracted Artifacts</h1>
            <p className="text-secondary font-label text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              SECURE DROPZONE // {received.length} VERIFIED PAYLOADS
            </p>
          </div>
          <div className="flex gap-2">
            {received.length > 0 && (
              <button onClick={clearReceived} className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">delete_sweep</span>
                  Purge All
              </button>
            )}
          </div>
        </header>

        {/* File Table matching stitch 2 Archive Registry */}
        <section className="bg-surface-container-low rounded-sm overflow-hidden border border-surface-container-highest">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high text-secondary text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Filename</th>
                  <th className="px-6 py-4 hidden md:table-cell">Origin</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4 hidden sm:table-cell">Timestamp</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-body">
                {received.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-xs font-mono text-secondary">
                      <span className="material-symbols-outlined text-4xl mb-2 opacity-50 block mx-auto">inbox</span>
                      NO INCOMING TELEMETRY
                    </td>
                  </tr>
                ) : (
                  received.map((file) => (
                    <tr key={file.id} className="hover:bg-surface-container-highest/50 transition-colors border-b border-surface-container-highest/30">
                      <td className="px-6 py-3 text-on-surface font-medium">
                        <div className="flex items-center gap-3">
                          {file.previewUrl && file.type.startsWith("image/") ? (
                            <img
                              src={file.previewUrl}
                              alt={file.name}
                              className="w-10 h-10 object-cover rounded-sm border border-surface-container-highest shrink-0"
                            />
                          ) : file.previewUrl && file.type.startsWith("video/") ? (
                            <video
                              src={file.previewUrl}
                              className="w-10 h-10 object-cover rounded-sm border border-surface-container-highest shrink-0"
                              muted
                              preload="metadata"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-tertiary text-lg w-10 h-10 flex items-center justify-center bg-surface-container-high rounded-sm shrink-0">{iconForType(file.type)}</span>
                          )}
                          <span className="truncate max-w-[150px] lg:max-w-xs">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-secondary hidden md:table-cell text-[10px] uppercase font-mono tracking-widest">
                        {file.from}
                      </td>
                      <td className="px-6 py-4 text-secondary text-xs font-mono">{formatBytes(file.size)}</td>
                      <td className="px-6 py-4 text-secondary text-xs font-mono hidden sm:table-cell">{formatTime(file.timestamp)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => downloadBlob(file.blob, file.name)} className="px-3 py-1 bg-tertiary-container/10 text-tertiary text-[10px] font-bold uppercase tracking-tighter hover:bg-tertiary hover:text-white transition-colors">
                            Extract
                          </button>
                          <button onClick={() => removeReceived(file.id)} className="px-3 py-1 bg-surface-container-high hover:bg-red-500/20 hover:text-red-500 text-secondary text-[10px] font-bold uppercase tracking-tighter transition-colors">
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
