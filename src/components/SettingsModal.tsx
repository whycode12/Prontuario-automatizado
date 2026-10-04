import React from 'react';
import { Settings, Key, X, Check, Database, Bot, Globe, CloudDownload, Download, Copy, Code2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  model: string;
  onSaveModel: (model: string) => void;
  onResetTemplates: () => void;
  onExportDefaultsFile?: () => void;
  onCopyDefaultsCode?: () => Promise<void>;
  onSaveAllAsGlobalDefault?: () => void;
  onPullGlobalDefaults?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  model,
  onSaveModel,
  onResetTemplates,
  onExportDefaultsFile,
  onCopyDefaultsCode,
  onSaveAllAsGlobalDefault,
  onPullGlobalDefaults,
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
      <div className="bg-white dark:bg-[#252525] rounded-lg shadow-2xl border border-[#ececeb] dark:border-[#333] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-4 py-3 bg-slate-50 dark:bg-[#202020] border-b border-[#ececeb] dark:border-[#333]/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500 dark:text-neutral-300" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-100">Configurações do Sistema</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          <div>
            <label className="block font-medium text-slate-700 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              Google Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-[#e5e5e5] dark:border-[#383838] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-neutral-500 font-mono text-xs bg-white dark:bg-[#202020] text-slate-800 dark:text-neutral-100"
            />
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
              A chave fica salva exclusivamente na memória local do seu navegador e nunca é enviada para servidores terceiros.
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
              Modelo de Inteligência Artificial
            </label>
            <select
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-[#e5e5e5] dark:border-[#383838] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-neutral-500 text-xs bg-white dark:bg-[#202020] text-slate-800 dark:text-neutral-100"
            >
              <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B (Menor fila, ultra-estável sem gargalos)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Equilibrado)</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Mais Recente)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Raciocínio Clínico Aprofundado)</option>
            </select>
          </div>

          {/* Padrões Globais do Sistema (Firebase) */}
          <div className="pt-3 border-t border-[#ececeb] dark:border-[#333]/80 space-y-2">
            <label className="block font-medium text-slate-700 dark:text-neutral-200 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              Padrões Globais do Sistema (Firebase)
            </label>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Defina as suas configurações atuais como o padrão oficial para todos os usuários do app, ou puxe o padrão global já publicado na nuvem.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onSaveAllAsGlobalDefault && (
                <button
                  type="button"
                  onClick={onSaveAllAsGlobalDefault}
                  className="px-2.5 py-1.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                  title="Publicar templates e prompts atuais como padrão global no Firebase"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Publicar Tudo como Padrão Global
                </button>
              )}
              {onPullGlobalDefaults && (
                <button
                  type="button"
                  onClick={onPullGlobalDefaults}
                  className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-[#202020] border border-[#e5e5e5] dark:border-[#383838] text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                  title="Substituir configurações atuais pelo padrão global da nuvem"
                >
                  <CloudDownload className="w-3.5 h-3.5" />
                  Puxar Padrão Global da Nuvem
                </button>
              )}
            </div>
          </div>

          {/* Exportação para Código-Fonte (GitHub) */}
          <div className="pt-3 border-t border-[#ececeb] dark:border-[#333]/80 space-y-2">
            <label className="block font-medium text-slate-700 dark:text-neutral-200 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-emerald-500" />
              Código-Fonte do Projeto (GitHub)
            </label>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Baixe o arquivo <code className="bg-slate-100 dark:bg-black/30 px-1 py-0.5 rounded font-mono text-[11px]">defaults.ts</code> com as suas alterações para substituir em <code className="bg-slate-100 dark:bg-black/30 px-1 py-0.5 rounded font-mono text-[11px]">src/data/defaults.ts</code> e commitar no GitHub.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onExportDefaultsFile && (
                <button
                  type="button"
                  onClick={onExportDefaultsFile}
                  className="px-2.5 py-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar defaults.ts
                </button>
              )}
              {onCopyDefaultsCode && (
                <button
                  type="button"
                  onClick={async () => {
                    await onCopyDefaultsCode();
                    alert('Código TypeScript de defaults.ts copiado com sucesso!');
                  }}
                  className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-[#202020] border border-[#e5e5e5] dark:border-[#383838] text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Código (.ts)
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#ececeb] dark:border-[#333]/80">
            <label className="block font-medium text-slate-700 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
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

        <div className="px-4 py-3 bg-slate-50 dark:bg-[#202020] border-t border-[#ececeb] dark:border-[#333]/80 flex items-center justify-between">
          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            {savedNotice && '✓ Configurações salvas!'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-[#2b2b2b] border border-[#e5e5e5] dark:border-[#383838] rounded"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 px-3 py-1.5 rounded text-xs font-medium transition-colors"
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
