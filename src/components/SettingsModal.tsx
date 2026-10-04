import React from 'react';
import { Settings, Key, X, Check, Database, Bot } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  model: string;
  onSaveModel: (model: string) => void;
  onResetTemplates: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  model,
  onSaveModel,
  onResetTemplates,
}) => {
  const [localKey, setLocalKey] = React.useState(apiKey);
  const [localModel, setLocalModel] = React.useState(model);
  const [savedNotice, setSavedNotice] = React.useState(false);

  React.useEffect(() => {
    setLocalKey(apiKey);
    setLocalModel(model || 'gemini-3.8-flash');
  }, [apiKey, model]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(localKey);
    onSaveModel(localModel);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-navy-850 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-4 py-3 bg-slate-50 dark:bg-navy-900 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-ice-400" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-ice-100">Configurações do Sistema</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-ice-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-ice-200 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              Google Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-ice-400 font-mono text-xs bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              A chave fica salva exclusivamente na memória local do seu navegador (LocalStorage) e nunca é enviada para servidores terceiros.
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-ice-200 mb-1 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-ice-400" />
              Modelo de Inteligência Artificial
            </label>
            <select
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-ice-400 text-xs bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100"
            >
              <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B (Menor fila, ultra-estável sem gargalos)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Equilibrado)</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Mais Recente)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Raciocínio Clínico Aprofundado)</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="block font-medium text-slate-700 dark:text-ice-200 mb-1 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              Restauração de Dados
            </label>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Deseja restaurar todos os templates e prompts para os padrões originais do sistema?')) {
                  onResetTemplates();
                  alert('Templates e prompts restaurados com sucesso!');
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-600 underline font-medium"
            >
              Restaurar Templates e Prompts Padrão de Fábrica
            </button>
          </div>
        </div>

        <div className="px-4 py-3 bg-slate-50 dark:bg-navy-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            {savedNotice && '✓ Configurações salvas!'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
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
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
