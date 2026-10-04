import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sparkles, ArrowDownToLine } from 'lucide-react';

interface AIDrawerProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'neutral' | 'amber' | 'blue' | 'rose' | 'indigo';
  onImplement?: () => void;
  implementLabel?: string;
  triggerUpdate?: any;
  className?: string;
}

export const AIDrawer: React.FC<AIDrawerProps> = ({
  title,
  icon,
  children,
  variant = 'neutral',
  onImplement,
  implementLabel = 'Implementar no campo',
  triggerUpdate,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Reabre a gaveta sempre que a IA gerar um novo resultado
  useEffect(() => {
    if (triggerUpdate !== undefined) {
      setIsOpen(true);
    }
  }, [triggerUpdate]);

  const colorStyles = {
    neutral: 'border-[#e5e5e5] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#202020]',
    amber: 'border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40',
    blue: 'border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-navy-900',
    rose: 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40',
    indigo: 'border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-navy-900',
  };

  const titleStyles = {
    neutral: 'text-slate-800 dark:text-neutral-200',
    amber: 'text-amber-900 dark:text-amber-300',
    blue: 'text-blue-900 dark:text-ice-200',
    rose: 'text-rose-900 dark:text-rose-200',
    indigo: 'text-indigo-900 dark:text-ice-200',
  };

  return (
    <div className={`mt-2.5 p-3 rounded-lg border transition-all duration-200 animate-in fade-in ${colorStyles[variant]} ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-xs font-semibold flex items-center gap-1.5 ${titleStyles[variant]}`}>
          {icon || <Sparkles className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />}
          {title}
        </span>

        <div className="flex items-center gap-1.5 ml-auto">
          {onImplement && (
            <button
              type="button"
              onClick={onImplement}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-white dark:bg-[#262626] border border-[#d4d4d4] dark:border-[#404040] text-slate-700 dark:text-neutral-200 hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Implementar texto no campo"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>{implementLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-md bg-white dark:bg-[#262626] border border-[#d4d4d4] dark:border-[#404040] text-slate-700 dark:text-neutral-200 hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] flex items-center justify-center transition-colors shadow-2xs"
            title={isOpen ? 'Recolher' : 'Expandir'}
          >
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="pt-2 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
};
