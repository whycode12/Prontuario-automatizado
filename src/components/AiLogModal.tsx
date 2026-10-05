import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Trash2, Terminal, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { getAiLogs, clearAiLogs, subscribeAiLogs, type AiLogEntry } from '../utils/aiLogger';

interface AiLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiLogModal: React.FC<AiLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AiLogEntry[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLogs(getAiLogs());
      return subscribeAiLogs(() => {
        setLogs(getAiLogs());
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyAll = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.status.toUpperCase()}] ${l.action} (${l.model})\n${l.message}${
            l.errorDetails ? `\nDetalhes do Erro:\n${l.errorDetails}` : ''
          }\n`
      )
      .join('\n----------------------------------------\n\n');

    navigator.clipboard.writeText(text || 'Nenhum log gravado.');
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleClear = () => {
    if (window.confirm('Deseja limpar o histórico de logs da IA?')) {
      clearAiLogs();
      setLogs([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#202020] border border-[#ececeb] dark:border-[#333] rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden text-slate-800 dark:text-neutral-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#ececeb] dark:border-[#2e2e2e] flex items-center justify-between bg-[#fafafa] dark:bg-[#1c1c1c]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-slate-100 dark:bg-[#282828] text-slate-700 dark:text-neutral-300">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Console de Logs da I.A.
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Histórico detalhado de requisições, diagnósticos e eventuais erros da API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {logs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors"
                  title="Copiar todos os logs"
                >
                  {copiedAll ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors"
                  title="Limpar logs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors ml-1"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-neutral-500 font-sans">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-1" />
              <p className="text-sm font-medium">Nenhum evento registrado ainda.</p>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
                Ao clicar em botões que ativam a inteligência artificial, o log em tempo real aparecerá aqui.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const isError = log.status === 'error';
              const isRunning = log.status === 'running';
              const isSuccess = log.status === 'success';

              return (
                <div
                  key={log.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isError
                      ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20'
                      : isRunning
                      ? 'border-sky-200 dark:border-sky-900/50 bg-sky-50/30 dark:bg-sky-950/20'
                      : 'border-[#ececeb] dark:border-[#2e2e2e] bg-[#fafafa] dark:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {isRunning && <Clock className="w-3.5 h-3.5 text-sky-500 animate-spin" />}
                      {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      {isError && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                      <span className="font-semibold text-slate-800 dark:text-neutral-200">
                        {log.action}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-[#282828] text-slate-600 dark:text-neutral-400 font-sans">
                        {log.model}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-neutral-500 font-sans">
                      {log.durationMs !== undefined && (
                        <span>{log.durationMs}ms</span>
                      )}
                      <span>{log.timestamp}</span>
                    </div>
                  </div>

                  <p
                    className={`text-xs whitespace-pre-wrap leading-relaxed ${
                      isError
                        ? 'text-rose-700 dark:text-rose-300 font-sans font-medium'
                        : 'text-slate-700 dark:text-neutral-300 font-sans'
                    }`}
                  >
                    {log.message}
                  </p>

                  {log.errorDetails && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLogId(expandedLogId === log.id ? null : log.id)
                        }
                        className="text-[11px] text-rose-600 dark:text-rose-400 underline hover:no-underline font-sans cursor-pointer"
                      >
                        {expandedLogId === log.id ? 'Ocultar detalhes do erro' : 'Exibir detalhes do erro'}
                      </button>

                      {expandedLogId === log.id && (
                        <div className="mt-1.5 p-2.5 rounded bg-black/90 text-rose-300 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-rose-900/40">
                          {log.errorDetails}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[#ececeb] dark:border-[#2e2e2e] bg-[#fafafa] dark:bg-[#1c1c1c] flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
          <span>{logs.length} registro(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-slate-50 dark:hover:bg-[#2c2c2c] text-slate-700 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
