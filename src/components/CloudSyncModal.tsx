import React, { useState } from 'react';
import {
  Cloud,
  Lock,
  UploadCloud,
  DownloadCloud,
  AlertCircle,
  Key,
  CheckCircle2,
  RefreshCw,
  FileDown,
  FileUp,
  User,
  LogOut,
  UserCheck
} from 'lucide-react';
import {
  auth,
  loginDoctor,
  registerDoctor,
  logoutDoctor
} from '../services/firebase';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  encryptionKey: string;
  onSaveEncryptionKey: (key: string) => void;
  onSyncToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
  localRecordsCount: number;
  onExportLocalBackup: () => void;
  onImportLocalBackup: (file: File) => Promise<void>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  encryptionKey,
  onSaveEncryptionKey,
  onSyncToCloud,
  onPullFromCloud,
  localRecordsCount,
  onExportLocalBackup,
  onImportLocalBackup,
}) => {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Form de Login / Cadastro
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Preencha o identificador (CRM/Usuário/E-mail) e a senha.' });
      return;
    }
    if (passwordInput.length < 6) {
      setStatusMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    setAuthLoading(true);
    setStatusMessage(null);
    try {
      if (isRegisterMode) {
        await registerDoctor(usernameInput.trim(), passwordInput);
        onSaveEncryptionKey(passwordInput);
        setStatusMessage({ type: 'success', text: 'Conta de médico criada com sucesso!' });
      } else {
        await loginDoctor(usernameInput.trim(), passwordInput);
        onSaveEncryptionKey(passwordInput);
        setStatusMessage({ type: 'success', text: 'Login realizado com sucesso!' });
      }
      setUsernameInput('');
      setPasswordInput('');
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        setStatusMessage({ type: 'error', text: 'Esse usuário já existe. Alterne para Entrar.' });
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setStatusMessage({ type: 'error', text: 'Usuário ou senha incorretos.' });
      } else {
        setStatusMessage({ type: 'error', text: err.message || 'Falha na autenticação.' });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutDoctor();
      setStatusMessage({ type: 'success', text: 'Desconectado com sucesso.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpload = async () => {
    if (!currentUser) {
      setStatusMessage({ type: 'error', text: 'Você precisa estar logado para enviar à nuvem.' });
      return;
    }
    if (!encryptionKey) {
      setStatusMessage({ type: 'error', text: 'Chave de criptografia ausente. Faça login novamente.' });
      return;
    }
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      await onSyncToCloud();
      setStatusMessage({ type: 'success', text: 'Atendimentos criptografados e salvos no seu espaço exclusivo!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Falha no envio: ${err.message || 'Erro ao conectar ao Firebase'}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async () => {
    if (!currentUser) {
      setStatusMessage({ type: 'error', text: 'Você precisa estar logado para baixar da nuvem.' });
      return;
    }
    if (!encryptionKey) {
      setStatusMessage({ type: 'error', text: 'Chave de criptografia ausente. Faça login novamente.' });
      return;
    }
    setIsPulling(true);
    setStatusMessage(null);
    try {
      await onPullFromCloud();
      setStatusMessage({ type: 'success', text: 'Seus pacientes foram baixados e restaurados no navegador!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Falha no download: ${err.message || 'Erro de sincronização'}` });
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
                Acesso Individual por Médico & Nuvem Segura
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Cada médico acessa exclusivamente seus próprios pacientes com isolamento total.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 dark:text-neutral-300">
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

          {/* SESSÃO: MÉDICO CONECTADO OU FORMULÁRIO DE LOGIN */}
          {currentUser ? (
            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-emerald-950 dark:text-emerald-200 block text-xs">
                    Médico Conectado:
                  </span>
                  <span className="text-[11px] text-emerald-800/90 dark:text-emerald-300/80 font-mono">
                    {currentUser.email?.replace('@prontuario.med.br', '')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-[#252525] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Sair desta conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-3 bg-slate-50 dark:bg-[#1a1a1a] p-4 rounded-xl border border-slate-200 dark:border-[#2e2e2e]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-neutral-200 text-xs flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-ice-500" />
                  {isRegisterMode ? 'Cadastrar Novo Médico' : 'Entrar com Conta de Médico'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="text-xs text-ice-600 dark:text-ice-400 hover:underline font-medium"
                >
                  {isRegisterMode ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    CRM ou Nome de Usuário
                  </label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Ex: thiago ou 123456sp"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#383838] bg-white dark:bg-[#252525] text-slate-800 dark:text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-ice-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Senha Pessoal
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Mínimo 6 caracteres..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#383838] bg-white dark:bg-[#252525] text-slate-800 dark:text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-ice-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2 bg-ice-500 hover:bg-ice-600 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {authLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Key className="w-3.5 h-3.5" />
                )}
                <span>{isRegisterMode ? 'Criar Conta de Médico' : 'Entrar no Meu Espaço'}</span>
              </button>
            </form>
          )}

          {/* Sincronização em Nuvem (Disponível quando logado) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={!currentUser || isSyncing || isPulling}
              onClick={handleUpload}
              className="p-3.5 rounded-xl border border-ice-500/30 bg-ice-50/40 dark:bg-ice-950/20 hover:bg-ice-500/10 dark:hover:bg-ice-900/40 flex flex-col items-center justify-center text-center gap-2 transition-all group disabled:opacity-40"
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
                  Enviar para Meu Espaço
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                  Sobe os {localRecordsCount} registros deste navegador
                </span>
              </div>
            </button>

            <button
              type="button"
              disabled={!currentUser || isSyncing || isPulling}
              onClick={handleDownload}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-slate-50 dark:hover:bg-[#2a2a2a] flex flex-col items-center justify-center text-center gap-2 transition-all group disabled:opacity-40"
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
                  Baixar Meus Pacientes
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                  Restaura apenas os pacientes deste médico
                </span>
              </div>
            </button>
          </div>

          {/* Backup Offline em Arquivo */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#2e2e2e] space-y-2">
            <span className="font-semibold text-slate-800 dark:text-neutral-200 text-xs block">
              🛡️ Cópia de Emergência Offline (Exportar / Importar Arquivo)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onExportLocalBackup}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-slate-50 dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-neutral-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                title="Baixar arquivo com todos os dados"
              >
                <FileDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Exportar Arquivo (.json)</span>
              </button>

              <label className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-slate-50 dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-neutral-200 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                <FileUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Restaurar de Arquivo</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await onImportLocalBackup(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#1c1c1c] border-t border-slate-200 dark:border-[#2e2e2e] flex items-center justify-between">
          <span className="text-[11px] text-slate-400 dark:text-neutral-500 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Isolamento por UID + Criptografia AES-256
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
