import { useState, useRef } from "react";

interface TextShareProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function TextShare({ onSend, disabled }: TextShareProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isUrl = /^https?:\/\/\S+$/i.test(text.trim());
  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
    textareaRef.current?.focus();
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
      }
    } catch {
      // Clipboard API not available or denied
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border border-outline">
      <div className="flex items-center justify-between px-4 py-2 border-b border-outline">
        <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
          {isUrl ? "URL Detected" : "Text Share"}
        </span>
        <button
          onClick={handlePaste}
          className="font-mono text-[10px] text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">content_paste</span>
          Paste
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste a URL or type a message..."
        rows={3}
        className="w-full bg-transparent px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 resize-none focus:outline-none"
      />
      <div className="flex items-center justify-between px-4 py-2 border-t border-outline">
        <span className="font-mono text-[10px] text-on-surface-variant/40">
          {text.length > 0 ? `${text.length} chars` : "⌘+Enter to send"}
        </span>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="bg-primary text-white px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider hover:bg-primary-hover transition-colors disabled:opacity-30 flex items-center gap-1.5 min-h-[36px]"
        >
          <span className="material-symbols-outlined text-sm">{isUrl ? "link" : "send"}</span>
          {isUrl ? "Share URL" : "Send"}
        </button>
      </div>
    </div>
  );
}
