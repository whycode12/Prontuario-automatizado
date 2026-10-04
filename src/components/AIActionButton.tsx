import React from 'react';
import { Eye, Edit3, Sparkles, X, RotateCcw, User, Globe } from 'lucide-react';

interface AIActionProps {
  label: string;
  onExecute: () => void;
  isLoading: boolean;
  promptKey: string;
  currentPrompt: string;
  onSavePrompt: (newPrompt: string) => void;
  onSaveGlobalPrompt?: (newPrompt: string) => void;
  onResetPrompt?: () => void;
  contextPayload: string;
  payloadTemplate: string;
  onSavePayloadTemplate: (newTemplate: string) => void;
  onSaveGlobalPayloadTemplate?: (newTemplate: string) => void;
  onResetPayloadTemplate: () => void;
  compact?: boolean;
}

export const AIActionButton: React.FC<AIActionProps> = ({
  label,
  onExecute,
  isLoading,
  currentPrompt,
  onSavePrompt,
  onSaveGlobalPrompt,
  onResetPrompt,
  contextPayload,
  payloadTemplate,
  onSavePayloadTemplate,
  onSaveGlobalPayloadTemplate,
  onResetPayloadTemplate,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'prompt' | 'payload_preview' | 'payload_template'>('prompt');
  const [editedPrompt, setEditedPrompt] = React.useState(currentPrompt);
  const [editedPayloadTemplate, setEditedPayloadTemplate] = React.useState(payloadTemplate);
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEditedPrompt(currentPrompt);
  }, [currentPrompt]);

  React.useEffect(() => {
    setEditedPayloadTemplate(payloadTemplate);
  }, [payloadTemplate]);

  const handleSavePromptUser = () => {
    onSavePrompt(editedPrompt);
    setSavedNotice('✓ Prompt salvo no seu usuário!');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleSavePromptGlobal = () => {
    if (onSaveGlobalPrompt) {
      if (window.confirm('Tem certeza que deseja definir este prompt como o PADRÃO GLOBAL do sistema? Todos os usuários e novos logins usarão este prompt.')) {
        onSaveGlobalPrompt(editedPrompt);
        setSavedNotice('✓ Prompt definido como Padrão Global do Sistema!');
        setTimeout(() => setSavedNotice(null), 2500);
      }
    }
  };

  const handleResetPromptAction = () => {
    if (onResetPrompt && window.confirm('Deseja restaurar o prompt deste botão para o original de fábrica?')) {
      onResetPrompt();
      setSavedNotice('✓ Prompt restaurado para o original!');
      setTimeout(() => setSavedNotice(null), 2000);
    }
  };

  const handleSavePayloadUser = () => {
    onSavePayloadTemplate(editedPayloadTemplate);
    setSavedNotice('✓ Template de dados salvo no seu usuário!');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleSavePayloadGlobal = () => {
    if (onSaveGlobalPayloadTemplate) {
      if (window.confirm('Tem certeza que deseja definir este template de dados como o PADRÃO GLOBAL do sistema?')) {
        onSaveGlobalPayloadTemplate(editedPayloadTemplate);
        setSavedNotice('✓ Template de dados definido como Padrão Global!');
        setTimeout(() => setSavedNotice(null), 2500);
      }
    }
  };

  const handleResetPayloadAction = () => {
    if (window.confirm('Deseja restaurar o template de envio de dados para o original de fábrica?')) {
      onResetPayloadTemplate();
      setSavedNotice('✓ Template de dados restaurado para o original!');
      setTimeout(() => setSavedNotice(null), 2000);
    }
  };

  return (
    <>
      <div className="inline-flex items-center rounded-md border border-[#e5e5e5] dark:border-[#383838] bg-white dark:bg-[#252525] shadow-2xs overflow-hidden h-7">
        <button
          type="button"
          onClick={onExecute}
          disabled={isLoading}
          className="h-full px-2 text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors disabled:opacity-50 flex items-center justify-center"
          title={`Executar IA: ${label}`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-full border-l border-[#e5e5e5] dark:border-[#383838] px-2 text-slate-400 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors flex items-center justify-center"
          title={`Ver prompt e dados enviados (${label})`}
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#252525] rounded-lg shadow-2xl border border-[#ececeb] dark:border-[#333] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-[#202020] border-b border-[#ececeb] dark:border-[#333]/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-100">Controle de IA: {label}</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-header / Tabs */}
            <div className="flex border-b border-[#ececeb] dark:border-[#333]/80 bg-slate-100/60 dark:bg-black/20 px-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('prompt')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'prompt'
                    ? 'border-slate-800 text-slate-900 dark:border-neutral-200 dark:text-white bg-white dark:bg-[#252525] font-semibold'
                    : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                1. Prompt da IA (Instruções)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payload_preview')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'payload_preview'
                    ? 'border-slate-800 text-slate-900 dark:border-neutral-200 dark:text-white bg-white dark:bg-[#252525] font-semibold'
                    : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                2. Dados Enviados (Preview)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payload_template')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'payload_template'
                    ? 'border-slate-800 text-slate-900 dark:border-neutral-200 dark:text-white bg-white dark:bg-[#252525] font-semibold'
                    : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                3. Editar Template dos Dados
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 overflow-y-auto text-xs">
              {activeTab === 'prompt' && (
                <div className="space-y-2">
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Edite as instruções enviadas para a IA neste botão. Escolha se deseja salvar apenas para o seu usuário ou como o padrão global do sistema.
                  </p>
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    rows={12}
                    className="w-full font-mono text-xs p-3 rounded border border-[#e5e5e5] dark:border-[#333] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-neutral-500 leading-relaxed bg-slate-50 dark:bg-[#202020] text-slate-800 dark:text-neutral-100"
                  />
                  <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
                    <button
                      type="button"
                      onClick={handleResetPromptAction}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Restaurar o prompt original de fábrica"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restaurar Original
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                        {savedNotice}
                      </span>
                      <button
                        type="button"
                        onClick={handleSavePromptUser}
                        className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        title="Salvar somente para o meu usuário"
                      >
                        <User className="w-3.5 h-3.5" />
                        Salvar no Meu Usuário
                      </button>
                      {onSaveGlobalPrompt && (
                        <button
                          type="button"
                          onClick={handleSavePromptGlobal}
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
              )}

              {activeTab === 'payload_preview' && (
                <div className="space-y-2">
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Texto exato gerado a partir do seu template e preenchido com as informações atuais do caso clínico:
                  </p>
                  <pre className="w-full font-mono text-[11px] p-3 rounded bg-slate-900 text-slate-100 border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[350px]">
                    {contextPayload}
                  </pre>
                </div>
              )}

              {activeTab === 'payload_template' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Template padrão que monta os dados do caso enviados à IA. Você pode adicionar ou remover variáveis como <code className="bg-slate-200 dark:bg-black/40 px-1 py-0.5 rounded text-[10px]">{'{{NOME}}'}</code>, <code className="bg-slate-200 dark:bg-black/40 px-1 py-0.5 rounded text-[10px]">{'{{HMA}}'}</code>, etc.
                    </p>
                  </div>
                  <textarea
                    value={editedPayloadTemplate}
                    onChange={(e) => setEditedPayloadTemplate(e.target.value)}
                    rows={12}
                    className="w-full font-mono text-xs p-3 rounded border border-[#e5e5e5] dark:border-[#333] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-neutral-500 leading-relaxed bg-slate-50 dark:bg-[#202020] text-slate-800 dark:text-neutral-100"
                  />
                  <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
                    <button
                      type="button"
                      onClick={handleResetPayloadAction}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Restaurar o template original de envio de dados"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restaurar Original
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                        {savedNotice}
                      </span>
                      <button
                        type="button"
                        onClick={handleSavePayloadUser}
                        className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        title="Salvar somente para o meu usuário"
                      >
                        <User className="w-3.5 h-3.5" />
                        Salvar no Meu Usuário
                      </button>
                      {onSaveGlobalPayloadTemplate && (
                        <button
                          type="button"
                          onClick={handleSavePayloadGlobal}
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
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#202020] border-t border-[#ececeb] dark:border-[#333]/80 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-[#2b2b2b] border border-[#ececeb] dark:border-[#333] rounded"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
