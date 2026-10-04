import React from 'react';
import { Sliders, Check, X } from 'lucide-react';

interface TemplateEditorButtonProps {
  label: string;
  templateKey: string;
  currentTemplate: string;
  onSaveTemplate: (newTemplate: string) => void;
  compact?: boolean;
}

export const TemplateEditorButton: React.FC<TemplateEditorButtonProps> = ({
  label,
  currentTemplate,
  onSaveTemplate,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editedTemplate, setEditedTemplate] = React.useState(currentTemplate);
  const [savedNotice, setSavedNotice] = React.useState(false);

  React.useEffect(() => {
    setEditedTemplate(currentTemplate);
  }, [currentTemplate]);

  const handleSave = () => {
    onSaveTemplate(editedTemplate);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      setModalOpen(false);
    }, 1200);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="h-7 px-2.5 inline-flex items-center justify-center text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] rounded-md border border-[#e5e5e5] dark:border-[#383838] bg-white dark:bg-[#252525] transition-colors shadow-2xs text-xs font-medium"
        title={`Editar template padrão: ${label}`}
      >
        <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-navy-850 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 bg-slate-50 dark:bg-navy-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-ice-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-ice-100">
                  Editar Template Padrão: {label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-ice-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Modifique a estrutura padrão. Novos atendimentos carregarão automaticamente este texto.
                Tags como <code className="bg-slate-100 dark:bg-navy-950 dark:text-ice-300 px-1 py-0.5 rounded text-[11px]">{'{{NOME}}'}</code>, <code className="bg-slate-100 dark:bg-navy-950 dark:text-ice-300 px-1 py-0.5 rounded text-[11px]">{'{{QP}}'}</code>, etc., serão substituídas na compilação.
              </p>
              <textarea
                value={editedTemplate}
                onChange={(e) => setEditedTemplate(e.target.value)}
                rows={14}
                className="w-full font-mono text-xs p-3 rounded border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-ice-400 leading-relaxed bg-slate-50 dark:bg-navy-900 text-slate-800 dark:text-ice-100"
              />
            </div>

            <div className="px-4 py-3 bg-slate-50 dark:bg-navy-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                {savedNotice && '✓ Template padrão salvo com sucesso!'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-700 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 bg-ice-500 hover:bg-ice-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar como Padrão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
