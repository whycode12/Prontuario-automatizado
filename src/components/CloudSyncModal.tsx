import React, { useState } from 'react';
import {
  Cloud,
  Lock,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  AlertCircle,
  Key,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  encryptionKey: string;
  onSaveEncryptionKey: (key: string) => void;
  onSyncToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
  localRecordsCount: number;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  encryptionKey,
  onSaveEncryptionKey,
  onSyncToCloud,
  onPullFromCloud,
  localRecordsCount,
}) => {
  const [keyInput, setKeyInput] = useState(encryptionKey);
  const [showKey, setShowKey] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    setKeyInput(encryptionKey);
  }, [encryptionKey]);

  if (!isOpen) return null;

  const handleSaveKey = () => {
    if (!keyInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Informe uma senha mestra para criptografar seus dados.' });
      return;
    }
    onSaveEncryptionKey(keyInput.trim());
    setStatusMessage({ type: 'success', text: 'Senha mestra salva com sucesso!' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleUpload = async () => {
    if (!keyInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Defina e salve sua senha mestra antes de enviar para a nuvem.' });
      return;
    }
    onSaveEncryptionKey(keyInput.trim());
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      await onSyncToCloud();
      setStatusMessage({ type: 'success', text: 'Todos os atendimentos foram criptografados e salvos no Firebase!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Falha no envio: ${err.message || 'Erro ao conectar ao Firebase'}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async () => {
    if (!keyInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Informe sua senha mestra para descriptografar os dados da nuvem.' });
      return;
    }
    onSaveEncryptionKey(keyInput.trim());
    setIsPulling(true);
    setStatusMessage(null);
    try {
      await onPullFromCloud();
      setStatusMessage({ type: 'success', text: 'Dados baixados e descriptografados com sucesso no seu navegador!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Falha no download: ${err.message || 'Verifique sua senha mestra'}` });
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#202020] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2e2e2e] w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#2e2e2e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ice-500/10 border border-ice-500/20 flex items-center justify-center text-ice-500">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                Nuvem Firebase & Criptografia Ponta a Ponta
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Sincronize seus atendimentos entre dispositivos com segurança militar (AES-256).
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-xs text-slate-700 dark:text-neutral-300">
          {/* Banner de Segurança */}
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-xs">
                Arquitetura Zero-Knowledge (Sigilo Médico CFM / LGPD)
              </span>
              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed">
                Os dados do paciente são criptografados no seu navegador <strong>antes</strong> de saírem para o Firebase. Nem o Google nem terceiros conseguem ler seus prontuários sem a sua Senha Mestra.
              </p>
            </div>
          </div>

          {/* Campo de Senha Mestra */}
          <div className="space-y-2 bg-slate-50 dark:bg-[#1a1a1a] p-3.5 rounded-xl border border-slate-200 dark:border-[#2e2e2e]">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                Senha Mestra de Criptografia
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-slate-500 dark:text-neutral-400 hover:underline"
              >
                {showKey ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Crie ou digite sua senha mestra..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-[#383838] bg-white dark:bg-[#252525] text-slate-800 dark:text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-ice-400"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                className="px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-slate-300 dark:border-[#3a3a3a] rounded-lg hover:bg-slate-100 dark:hover:bg-[#333] font-medium text-xs transition-colors"
              >
                Salvar
              </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-neutral-500">
              * Guarde essa senha com você. Você usará essa mesma senha para abrir seus dados em outro computador.
            </p>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Ações de Sincronização */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Upload para o Firebase */}
            <button
              type="button"
              disabled={isSyncing || isPulling}
              onClick={handleUpload}
              className="p-3.5 rounded-xl border border-ice-500/30 bg-ice-50/40 dark:bg-ice-950/20 hover:bg-ice-500/10 dark:hover:bg-ice-900/40 flex flex-col items-center justify-center text-center gap-2 transition-all group disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-ice-500 text-white flex items-center justify-center shadow-xs">
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-neutral-100 text-xs block">
                  Enviar para a Nuvem
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                  Criptografa e sobe os {localRecordsCount} registros deste navegador
                </span>
              </div>
            </button>

            {/* Download do Firebase */}
            <button
              type="button"
              disabled={isSyncing || isPulling}
              onClick={handleDownload}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-slate-50 dark:hover:bg-[#2a2a2a] flex flex-col items-center justify-center text-center gap-2 transition-all group disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#333] text-slate-700 dark:text-neutral-200 flex items-center justify-center shadow-xs">
                {isPulling ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <DownloadCloud className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-neutral-100 text-xs block">
                  Baixar da Nuvem
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                  Restaura e mescla atendimentos salvos no Firebase
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#1c1c1c] border-t border-slate-200 dark:border-[#2e2e2e] flex items-center justify-between">
          <span className="text-[11px] text-slate-400 dark:text-neutral-500 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Conexão direta com Firestore
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-slate-100 dark:hover:bg-[#2e2e2e] text-xs font-semibold text-slate-700 dark:text-neutral-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
