import { useState, useRef, useCallback } from "react";

interface DropZoneProps {
  title: string;
  subtitle: string;
  icon?: string;
  action?: string;
  variant?: "primary" | "default";
  className?: string;
  onFilesSelected?: (files: File[]) => void;
}

export default function DropZone({
  title,
  subtitle,
  icon = "upload_file",
  action,
  variant = "default",
  className = "",
  onFilesSelected,
}: DropZoneProps) {
  const isPrimary = variant === "primary";
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected?.(files);
      }
    },
    [onFilesSelected]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFilesSelected?.(files);
      }
      e.target.value = "";
    },
    [onFilesSelected]
  );

  return (
    <section className={`relative ${className}`}>
      {isPrimary && (
        <div className="flex items-baseline justify-between mb-4 mt-2">
          <h2 className="text-2xl font-headline font-bold uppercase tracking-tighter text-on-surface">{title}</h2>
          <span className="text-[10px] font-mono text-secondary/40 tracking-[0.2em] hidden sm:block">ENCRYPTED_TUNNEL::ACTIVE</span>
        </div>
      )}
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          w-full flex flex-col items-center justify-center group cursor-pointer transition-colors duration-500
          ${isPrimary ? "dashed-border py-8 hover:bg-surface-container-low/50" : "dashed-border py-6 hover:bg-surface-container-low/50"}
          ${isDragOver ? "bg-surface-container-low border-primary" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
          aria-label={`Select files for ${title}`}
        />
        <div className={`flex flex-col items-center gap-4 text-center ${isPrimary ? "p-8" : "p-4"}`}>
          <span className={`material-symbols-outlined text-[#FF513A] transition-transform duration-300 group-hover:-translate-y-2 ${isPrimary ? "text-4xl" : "text-2xl"}`}>
            {isDragOver ? "file_download" : icon}
          </span>
          <h3 className={`font-headline font-bold uppercase tracking-tight ${isPrimary ? "text-lg" : "text-sm"}`}>
            {isDragOver ? "AWAITING DROP" : isPrimary ? "Initialize Payload" : title}
          </h3>
          <p className={`font-mono text-secondary/60 ${isPrimary ? "text-[10px]" : "text-[8px]"}`}>
            {isDragOver ? "RELEASE TO TRANSMIT" : (
              <>
                DRAG & DROP OR <span className="text-[#FF513A] underline decoration-[#FF513A]/30 underline-offset-4">{action || "SELECT CORE FILES"}</span>
              </>
            )}
          </p>
        </div>
      </div>
      
      {!isPrimary && subtitle && (
        <div className="mt-2 text-[10px] font-mono text-secondary/50 uppercase tracing-wider text-center">{subtitle}</div>
      )}
    </section>
  );
}
