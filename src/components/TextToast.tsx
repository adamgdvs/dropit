import { useState, useEffect } from "react";
import type { TextShareMessage } from "../services/transfer";

interface TextToastProps {
  message: TextShareMessage;
  onDismiss: () => void;
}

export default function TextToast({ message, onDismiss }: TextToastProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("textarea");
      input.value = message.text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpen = () => {
    if (message.isUrl) {
      window.open(message.text, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      role="alertdialog"
      aria-label={`Text from ${message.senderName}`}
      className="fixed top-4 right-4 z-50 bg-surface border border-on-surface p-5 max-w-sm animate-slide-in"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 border border-primary text-primary flex items-center justify-center shrink-0" aria-hidden="true">
          <span className="material-symbols-outlined text-xl">
            {message.isUrl ? "link" : "chat"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] text-primary uppercase tracking-[0.2em] mb-1">
            // INCOMING {message.isUrl ? "URL" : "TEXT"}
          </p>
          <p className="font-mono text-[10px] text-on-surface-variant mb-2">
            FROM: {message.senderName.toUpperCase()}
          </p>
          {message.isUrl ? (
            <a
              href={message.text}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline underline-offset-2 break-all hover:opacity-80 transition-opacity"
            >
              {message.text}
            </a>
          ) : (
            <p className="text-sm text-on-surface break-words whitespace-pre-wrap line-clamp-6">
              {message.text}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <button
          onClick={handleCopy}
          className="py-2 bg-primary text-white font-mono text-[10px] uppercase tracking-wider hover:bg-primary-hover transition-colors min-h-[44px] flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
          {copied ? "Copied" : "Copy"}
        </button>
        {message.isUrl && (
          <button
            onClick={handleOpen}
            className="py-2 bg-primary text-white font-mono text-[10px] uppercase tracking-wider hover:bg-primary-hover transition-colors min-h-[44px] flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            Open
          </button>
        )}
        <button
          onClick={onDismiss}
          className={`py-2 border border-outline text-on-surface-variant font-mono text-[10px] uppercase tracking-wider hover:border-on-surface hover:text-on-surface transition-colors min-h-[44px] ${message.isUrl ? "" : "col-span-2"}`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
