import React from 'react';
import { RotateCcw, Copy, Check } from 'lucide-react';

interface UndoableTextareaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  headerRight?: React.ReactNode;
  hideActions?: boolean;
}

export const UndoableTextarea: React.FC<UndoableTextareaProps> = ({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  className = '',
  headerRight,
  hideActions = false,
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = React.useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = React.useState(0);
  const [copied, setCopied] = React.useState(false);

  // Auto-resize textarea height to fit content smoothly
  const adjustHeight = React.useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const minPx = rows * 28 + 16;
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, minPx)}px`;
    }
  }, [rows]);

  React.useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  React.useEffect(() => {
    adjustHeight();
    const timer = setTimeout(adjustHeight, 50);
    return () => clearTimeout(timer);
  }, [value, adjustHeight]);

  React.useEffect(() => {
    if (value !== history[historyIndex]) {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), value]);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevVal = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onChange(prevVal);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1.5 w-full">
      {(label || headerRight) && (
        <div className="flex items-center justify-between text-sm">
          {label ? (
            <span className="font-semibold text-slate-800 dark:text-ice-100 text-sm tracking-tight">
              {label}
            </span>
          ) : (
            <div />
          )}
          {!hideActions && (
            <div className="flex items-center gap-1.5">
              {headerRight}
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-ice-200 disabled:opacity-30 rounded hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
                title="Desfazer última alteração (Undo)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-ice-200 rounded hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
                title="Copiar texto"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        rows={rows}
        placeholder={placeholder}
        className={`w-full text-sm p-3 rounded-lg border border-[#e5e5e5] dark:border-[#333] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-neutral-500 font-sans leading-relaxed bg-white dark:bg-[#202020] text-slate-800 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 transition-colors resize-none overflow-hidden ${className}`}
      />
    </div>
  );
};
