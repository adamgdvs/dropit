import type { FileItem } from "../data/mock";

interface FileCardProps {
  file: FileItem;
  variant?: "recent" | "received" | "browse";
}

export default function FileCard({ file, variant = "recent" }: FileCardProps) {
  if (variant === "received") {
    return (
      <div className="group border-2 border-outline bg-surface hover:border-primary transition-all duration-150 flex flex-col">
        <div className="relative aspect-square bg-surface-variant flex items-center justify-center border-b-2 border-outline">
          <span className="material-symbols-outlined text-7xl text-primary">{file.icon}</span>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-black text-sm uppercase tracking-tight truncate mb-1">{file.name}</h3>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase mb-4">
            From: {file.from} &bull; {file.time}
          </p>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <button className="py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-hover transition-colors">
              Download
            </button>
            <button className="py-2 border-2 border-outline text-on-surface text-[10px] font-black uppercase tracking-widest hover:border-primary transition-colors">
              Manage
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "browse") {
    return (
      <div className="bg-surface border border-outline p-6 hover:border-primary transition-all cursor-pointer">
        <div className="flex justify-between items-start mb-6">
          <div className="p-2 border border-primary text-primary">
            <span className="material-symbols-outlined text-2xl">{file.icon}</span>
          </div>
          <button className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>
        <h3 className="font-bold truncate">{file.name}</h3>
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
          {file.type.toUpperCase()} &bull; {file.size}
        </p>
      </div>
    );
  }

  // "recent" variant
  return (
    <div className="bg-surface border-2 border-outline hover:border-primary transition-colors cursor-pointer group p-1">
      <div className="aspect-square bg-surface-variant flex items-center justify-center border border-outline">
        <span className="material-symbols-outlined text-5xl text-primary">{file.icon}</span>
      </div>
      <div className="p-3">
        <p className="font-bold text-sm truncate uppercase tracking-tight">{file.name}</p>
        <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-1">
          {file.size} &bull; {file.time}
        </p>
      </div>
    </div>
  );
}
