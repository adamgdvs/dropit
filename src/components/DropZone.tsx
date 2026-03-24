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
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          ${isPrimary
            ? isDragOver
              ? "border-2 border-dashed border-primary bg-primary/5"
              : "border-2 border-dashed border-on-surface-variant bg-background hover:border-primary hover:bg-primary/5"
            : isDragOver
              ? "border border-dashed border-primary bg-primary/5"
              : "border border-dashed border-outline bg-surface hover:border-on-surface hover:bg-background"
          }
          flex flex-col items-center justify-center transition-colors cursor-pointer
          ${isPrimary ? "p-12 md:p-16" : "p-10"}
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
        <div
          className={`
            ${isPrimary
              ? "w-16 h-16 border border-on-surface-variant text-on-surface-variant mb-6"
              : "w-10 h-10 border border-outline text-on-surface-variant mb-4"
            }
            flex items-center justify-center transition-colors
            ${isDragOver ? "border-primary text-primary" : ""}
          `}
        >
          <span className={`material-symbols-outlined ${isPrimary ? "text-3xl" : "text-xl"}`}>
            {isDragOver ? "file_download" : icon}
          </span>
        </div>
        <h3
          className={`font-bold uppercase tracking-tight ${
            isPrimary ? "text-2xl mb-2" : "text-sm"
          }`}
        >
          {isDragOver ? "Drop Here" : title}
        </h3>
        <p className={`font-mono text-on-surface-variant text-center ${isPrimary ? "text-xs max-w-sm mb-8" : "text-[10px] mt-1 max-w-[200px]"}`}>
          {isDragOver ? "Release to add files" : subtitle}
        </p>
        {action && !isDragOver && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-8 py-3 bg-primary text-white font-mono text-xs uppercase tracking-wider hover:bg-primary-hover transition-colors"
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
}
