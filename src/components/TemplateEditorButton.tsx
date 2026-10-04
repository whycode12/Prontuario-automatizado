import React from 'react';
import { Sliders, X, User, Globe } from 'lucide-react';

interface TemplateEditorButtonProps {
  label: string;
  templateKey: string;
  currentTemplate: string;
  onSaveTemplate: (newTemplate: string) => void;
  onSaveGlobalTemplate?: (newTemplate: string) => void;
  compact?: boolean;
}

export const TemplateEditorButton: React.FC<TemplateEditorButtonProps> = ({
  label,
  currentTemplate,
  onSaveTemplate,
  onSaveGlobalTemplate,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editedTemplate, setEditedTemplate] = React.useState(currentTemplate);
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEditedTemplate(currentTemplate);
  }, [currentTemplate]);

  const handleSaveUser = () => {
    onSaveTemplate(editedTemplate);
    setSavedNotice('✓ Salvo no seu usuário!');
    setTimeout(() => {
      setSavedNotice(null);
      setModalOpen(false);
    }, 1200);
  };

  const handleSaveGlobal = () => {
    if (onSaveGlobalTemplate) {
      if (window.confirm('Tem certeza que deseja definir este template como o PADRÃO GLOBAL de todo o sistema? Todos os usuários e novos logins usarão este texto como base.')) {
        onSaveGlobalTemplate(editedTemplate);
        setSavedNotice('✓ Definido como Padrão Global do Sistema!');
        setTimeout(() => {
          setSavedNotice(null);
          setModalOpen(false);
        }, 1500);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="h-7 px-2.5 inline-flex items-center justify-center text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] rounded-md border border-[#e5e5e5] dark:border-[#383838] bg-white dark:bg-[#252525] transition-colors shadow-2xs text-xs font-medium"
        title={`Editar template: ${label}`}
      >
        <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#252525] rounded-lg shadow-2xl border border-[#ececeb] dark:border-[#333] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 bg-slate-50 dark:bg-[#202020] border-b border-[#ececeb] dark:border-[#333]/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-100">
                  Editar Template: {label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Modifique a estrutura deste template. Variáveis como <code className="bg-slate-100 dark:bg-[#1a1a1a] dark:text-neutral-300 px-1 py-0.5 rounded text-[11px]">{'{{NOME}}'}</code>, <code className="bg-slate-100 dark:bg-[#1a1a1a] dark:text-neutral-300 px-1 py-0.5 rounded text-[11px]">{'{{QP}}'}</code>, etc., serão preenchidas na compilação.
              </p>
              <div className="p-2.5 rounded bg-blue-50/70 dark:bg-navy-900 border border-blue-200/80 dark:border-blue-800/60 text-xs text-blue-900 dark:text-ice-200 space-y-1">
                <span className="font-semibold text-[11px]">Tags de Orientações e Sinais de Alarme (puxe individualmente onde desejar):</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="font-mono text-[10px] bg-white dark:bg-[#202020] px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">{'{{orientacoes_prontuario}}'}</span>
                  <span className="font-mono text-[10px] bg-white dark:bg-[#202020] px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">{'{{alarme_prontuario}}'}</span>
                  <span className="font-mono text-[10px] bg-white dark:bg-[#202020] px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">{'{{orientacoes_paciente}}'}</span>
                  <span className="font-mono text-[10px] bg-white dark:bg-[#202020] px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">{'{{alarme_paciente}}'}</span>
                </div>
              </div>
              <textarea
                value={editedTemplate}
                onChange={(e) => setEditedTemplate(e.target.value)}
                rows={14}
                className="w-full font-mono text-xs p-3 rounded border border-[#e5e5e5] dark:border-[#333] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-neutral-500 leading-relaxed bg-slate-50 dark:bg-[#202020] text-slate-800 dark:text-neutral-100"
              />
            </div>

            <div className="px-4 py-3 bg-slate-50 dark:bg-[#202020] border-t border-[#ececeb] dark:border-[#333]/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                {savedNotice}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-[#2b2b2b] border border-[#e5e5e5] dark:border-[#383838] rounded"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveUser}
                  className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  title="Salvar somente para o meu usuário logado"
                >
                  <User className="w-3.5 h-3.5" />
                  Salvar no Meu Usuário
                </button>
                {onSaveGlobalTemplate && (
                  <button
                    type="button"
                    onClick={handleSaveGlobal}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-2xs"
                    title="Definir como padrão global de todo o sistema no Firebase"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Definir Padrão Global
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
