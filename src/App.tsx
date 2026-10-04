import { useState, useEffect } from 'react';
import {
  FileText,
  UserPlus,
  Save,
  History,
  Settings,
  Pill,
  Bed,
  AlertCircle,
  Sun,
  Moon,
  Stethoscope,
  ClipboardList,
  PanelLeftClose,
  PanelLeft,
  Cloud,
  Sparkles
} from 'lucide-react';

import type {
  PatientData,
  VitalSigns,
  HppData,
  AIResult,
  ObservationData,
  FinalDocuments,
  SystemTemplates,
  SystemPrompts,
  SavedPatientRecord
} from './types';
import { DEFAULT_TEMPLATES, DEFAULT_PROMPTS, parseHppText } from './data/defaults';
import { buildCaseContextPayload, callGeminiApi } from './services/gemini';
import { SettingsModal } from './components/SettingsModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import {
  auth,
  saveRecordToCloud,
  fetchRecordsFromCloud,
  deleteRecordFromCloud,
  saveConfigToCloud,
  fetchConfigFromCloud,
  subscribeToCloudRecords,
  subscribeToCloudConfig,
  saveGlobalDefaultConfig,
  fetchGlobalDefaultConfig,
  subscribeToGlobalDefaultConfig,
  saveUserApiKey,
  fetchUserApiKey,
  subscribeToUserApiKey
} from './services/firebase';
import { downloadDefaultsFile, copyDefaultsCodeToClipboard } from './utils/defaultsExporter';

import { AtendimentoView } from './views/AtendimentoView';
import { DocumentosView } from './views/DocumentosView';
import { EvolucaoView } from './views/EvolucaoView';
import { FilaObservacaoView } from './views/FilaObservacaoView';
import { HistoricoView } from './views/HistoricoView';

const STORAGE_KEYS = {
  API_KEY: 'prontuario_gemini_api_key',
  MODEL: 'prontuario_gemini_model',
  TEMPLATES: 'prontuario_custom_templates',
  PROMPTS: 'prontuario_custom_prompts',
  RECORDS: 'prontuario_saved_records',
  SUS_FILTER: 'prontuario_sus_filter_active',
  THEME: 'prontuario_color_theme',
  ENCRYPTION_KEY: 'prontuario_master_encryption_key',
  CONFIG_SOURCE: 'prontuario_config_source',
  HIDE_AI: 'prontuario_hide_ai'
};

function computeObservationCountdown(startedAt?: string, revaluationMinutes: number = 120) {
  let remaining = revaluationMinutes;
  if (startedAt) {
    const match = startedAt.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const now = new Date();
      const start = new Date();
      start.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
      let diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
      if (diffMinutes < 0) diffMinutes += 24 * 60;
      remaining = revaluationMinutes - diffMinutes;
    }
  }

  let status: 'ok' | 'soon' | 'overdue' = 'ok';
  let text = `${remaining} min`;
  let badgeClass = 'text-[11px] font-medium px-2 py-0.5 rounded border border-slate-200 dark:border-[#383838] bg-slate-50 dark:bg-[#202020] text-slate-600 dark:text-neutral-300';

  if (remaining > 20) {
    status = 'ok';
    text = `${remaining} min`;
    badgeClass = 'text-[11px] font-medium px-2 py-0.5 rounded border border-slate-200 dark:border-[#383838] bg-slate-50 dark:bg-[#202020] text-slate-600 dark:text-neutral-300';
  } else if (remaining > 0) {
    status = 'soon';
    text = `${remaining} min`;
    badgeClass = 'text-[11px] font-medium px-2 py-0.5 rounded border border-amber-300/70 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300';
  } else {
    status = 'overdue';
    text = `Atrasado ${Math.abs(remaining)}m`;
    badgeClass = 'text-[11px] font-medium px-2 py-0.5 rounded border border-rose-300/70 dark:border-rose-900/70 bg-rose-50/50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300';
  }

  return { status, text, badgeClass, remaining };
}

export default function App() {
  // Theme state: default to 'dark'
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved !== null ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }, [isDark]);

  // Settings & Storage State
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.API_KEY) || '');
  const [model, setModel] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.MODEL) || 'gemini-3.8-flash');
  const [templates, setTemplates] = useState<SystemTemplates>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return saved ? { ...DEFAULT_TEMPLATES, ...JSON.parse(saved) } : DEFAULT_TEMPLATES;
  });
  const [prompts, setPrompts] = useState<SystemPrompts>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROMPTS);
    return saved ? { ...DEFAULT_PROMPTS, ...JSON.parse(saved) } : DEFAULT_PROMPTS;
  });
  const [savedRecords, setSavedRecords] = useState<SavedPatientRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return saved ? JSON.parse(saved) : [];
  });
  const [susFilter, setSusFilter] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.SUS_FILTER) !== 'false';
  });
  const [masterKey, setMasterKey] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY) || '';
  });
  const [currentDoctor, setCurrentDoctor] = useState(auth.currentUser);

  // Config Source: 'defaults' | 'global' | 'user'
  const [configSource, setConfigSource] = useState<'defaults' | 'global' | 'user'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG_SOURCE);
    return (saved === 'defaults' || saved === 'global' || saved === 'user') ? saved : 'global';
  });

  // Ocultar boxes de IA visualmente (Atendimento e Evolução)
  const [hideAiBoxes, setHideAiBoxes] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.HIDE_AI) === 'true';
  });

  const toggleHideAiBoxes = () => {
    setHideAiBoxes((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.HIDE_AI, String(next));
      return next;
    });
  };

  const handleSelectConfigSource = async (source: 'defaults' | 'global' | 'user') => {
    setConfigSource(source);
    localStorage.setItem(STORAGE_KEYS.CONFIG_SOURCE, source);

    if (source === 'defaults') {
      setTemplates(DEFAULT_TEMPLATES);
      setPrompts(DEFAULT_PROMPTS);
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
      localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(DEFAULT_PROMPTS));
      showToast('Configurações redefinidas para o Padrão do Código (defaults.ts)!');
    } else if (source === 'global') {
      try {
        const globalConfig = await fetchGlobalDefaultConfig();
        if (globalConfig) {
          if (globalConfig.templates) {
            setTemplates(globalConfig.templates);
            localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(globalConfig.templates));
          }
          if (globalConfig.prompts) {
            setPrompts(globalConfig.prompts);
            localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(globalConfig.prompts));
          }
          showToast('Padrão Global do Firebase aplicado!');
        } else {
          showToast('Nenhum Padrão Global encontrado no Firebase; mantendo os atuais.');
        }
      } catch (err: any) {
        showToast('Erro ao buscar Padrão Global: ' + (err.message || ''));
      }
    } else if (source === 'user') {
      const activeKey = masterKey.trim() || localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY) || '';
      if (auth.currentUser && activeKey) {
        try {
          const userConfig = await fetchConfigFromCloud(activeKey);
          if (userConfig) {
            if (userConfig.templates) {
              setTemplates(userConfig.templates);
              localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(userConfig.templates));
            }
            if (userConfig.prompts) {
              setPrompts(userConfig.prompts);
              localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(userConfig.prompts));
            }
            showToast('Configurações do usuário carregadas do Firebase!');
          }
        } catch (err: any) {
          showToast('Erro ao carregar configurações do usuário: ' + (err.message || ''));
        }
      } else {
        showToast('Modo de configurações personalizadas do usuário ativado.');
      }
    }
  };

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    let unsubscribeConfig: (() => void) | null = null;
    let unsubscribeGlobalConfig: (() => void) | null = null;
    let unsubscribeApiKey: (() => void) | null = null;

    const setupListener = (user: typeof auth.currentUser, key: string) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      if (unsubscribeConfig) {
        unsubscribeConfig();
        unsubscribeConfig = null;
      }
      if (unsubscribeGlobalConfig) {
        unsubscribeGlobalConfig();
        unsubscribeGlobalConfig = null;
      }
      if (user && key) {
        console.log('[App] Ativando sincronização em tempo real para:', user.email);
        unsubscribeSnapshot = subscribeToCloudRecords(key, (cloudRecords) => {
          setSavedRecords((prev) => {
            const map = new Map<string, SavedPatientRecord>();
            prev.forEach((r) => map.set(r.id, r));
            cloudRecords.forEach((r) => map.set(r.id, r));
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
            );
            localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(merged));
            return merged;
          });
        });

        // Escuta configurações do usuário apenas se a fonte for 'user'
        if (configSource === 'user') {
          unsubscribeConfig = subscribeToCloudConfig(key, (cloudConfig) => {
            if (cloudConfig?.templates) {
              setTemplates((prev) => ({ ...prev, ...cloudConfig.templates }));
              localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(cloudConfig.templates));
            }
            if (cloudConfig?.prompts) {
              setPrompts((prev) => ({ ...prev, ...cloudConfig.prompts }));
              localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(cloudConfig.prompts));
            }
          });
        }
      }

      // Se a fonte for 'global', escuta mudanças no padrão global do Firestore
      if (configSource === 'global') {
        unsubscribeGlobalConfig = subscribeToGlobalDefaultConfig((globalConfig) => {
          if (globalConfig?.templates) {
            setTemplates((prev) => ({ ...prev, ...globalConfig.templates }));
            localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(globalConfig.templates));
          }
          if (globalConfig?.prompts) {
            setPrompts((prev) => ({ ...prev, ...globalConfig.prompts }));
            localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(globalConfig.prompts));
          }
        });
      }
    };

    const setupApiKeyListener = (user: typeof auth.currentUser) => {
      if (unsubscribeApiKey) {
        unsubscribeApiKey();
        unsubscribeApiKey = null;
      }
      if (user) {
        // Tenta carregar do cache local específico deste usuário
        const userCachedKey = localStorage.getItem(`${STORAGE_KEYS.API_KEY}_${user.uid}`);
        if (userCachedKey) {
          setApiKey(userCachedKey);
        }
        // Busca da nuvem (Firestore)
        fetchUserApiKey().then((cloudKey) => {
          if (cloudKey) {
            setApiKey(cloudKey);
            localStorage.setItem(`${STORAGE_KEYS.API_KEY}_${user.uid}`, cloudKey);
            localStorage.setItem(STORAGE_KEYS.API_KEY, cloudKey);
          }
        });
        // Conecta escuta em tempo real da apiKey na nuvem
        unsubscribeApiKey = subscribeToUserApiKey((newKey) => {
          if (newKey) {
            setApiKey(newKey);
            localStorage.setItem(`${STORAGE_KEYS.API_KEY}_${user.uid}`, newKey);
            localStorage.setItem(STORAGE_KEYS.API_KEY, newKey);
          }
        });
      }
    };

    const unsubAuth = auth.onAuthStateChanged((user) => {
      setCurrentDoctor(user);
      const activeKey = masterKey.trim() || localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY) || '';
      setupListener(user, activeKey);
      setupApiKeyListener(user);
    });

    // Se já houver médico conectado, inicia listeners
    const currentKey = masterKey.trim() || localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY) || '';
    if (auth.currentUser) {
      if (currentKey) setupListener(auth.currentUser, currentKey);
      setupApiKeyListener(auth.currentUser);
    }

    return () => {
      unsubAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (unsubscribeConfig) unsubscribeConfig();
      if (unsubscribeGlobalConfig) unsubscribeGlobalConfig();
      if (unsubscribeApiKey) unsubscribeApiKey();
    };
  }, [masterKey, configSource]);

  // UI Navigation & Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cloudSyncOpen, setCloudSyncOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    return localStorage.getItem('prontuario_sidebar_open') !== 'false';
  });
  const [activeTab, setActiveTab] = useState<'atendimento' | 'documentos' | 'evolucao' | 'observacao' | 'historico'>('atendimento');

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('prontuario_sidebar_open', String(next));
      return next;
    });
  };

  // Active Patient Record ID (to unify updates for the same patient)
  const [currentRecordId, setCurrentRecordId] = useState<string>(() => Date.now().toString());
  const [autoSaveStatus, setAutoSaveStatus] = useState<'salvo' | 'salvando'>('salvo');

  // Patient & Case State
  const [patient, setPatient] = useState<PatientData>({
    nome: '',
    idade: '',
    sexo: '',
    peso: '',
    altura: ''
  });
  const [qp, setQp] = useState<string>('');
  const [hma, setHma] = useState<string>('');
  const [hpp, setHpp] = useState<HppData>(() => parseHppText(templates.hpp));
  const [vitals, setVitals] = useState<VitalSigns>({
    pa: '',
    fc: '',
    fr: '',
    sat: '',
    tax: ''
  });
  const [exameFisico, setExameFisico] = useState<string>(templates.exameFisico);
  const [examResults, setExamResults] = useState<string>('');
  const [condutas, setCondutas] = useState<string>('');

  // AI Inference State
  const [aiResults, setAiResults] = useState<AIResult>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // Observation State
  const [observation, setObservation] = useState<ObservationData>({
    inObservation: false,
    startedAt: undefined,
    revaluationTimeMinutes: 120,
    whatToReevaluate: '',
    clinicalReevaluationText: '',
    conclusionNewHypothesis: '',
    newConducts: ''
  });

  // Final Documents State
  const [documents, setDocuments] = useState<FinalDocuments>({
    prontuario: '',
    receitaInterna: '',
    receitaDomiciliar: '',
    passagemPlantao: '',
    passometro: '',
    evolucao: ''
  });

  // Notification Toast - Interface silenciosa (apenas erros críticos reais do sistema)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string, isError = false) => {
    const isCritical = isError || msg.toLowerCase().startsWith('erro') || msg.toLowerCase().startsWith('falha');
    if (!isCritical) return;
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync to local storage & cloud
  const handleSaveApiKey = async (key: string) => {
    setApiKey(key);
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
    if (auth.currentUser) {
      localStorage.setItem(`${STORAGE_KEYS.API_KEY}_${auth.currentUser.uid}`, key);
      try {
        await saveUserApiKey(key);
        showToast('Chave de API salva na sua conta na nuvem!');
      } catch (err: any) {
        console.warn('[Sync] Erro ao salvar chave de API na nuvem:', err);
      }
    } else {
      showToast('Chave de API salva localmente neste navegador.');
    }
  };
  const handleSaveModel = (m: string) => {
    setModel(m);
    localStorage.setItem(STORAGE_KEYS.MODEL, m);
  };
  const handleSaveTemplate = async (key: keyof SystemTemplates, value: string) => {
    const updated = { ...templates, [key]: value };
    setTemplates(updated);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
    showToast(`Template padrão atualizado!`);

    const activeKey = masterKey.trim() || localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY) || '';
    if (auth.currentUser && activeKey) {
      try {
        await saveConfigToCloud(updated, prompts, activeKey);
      } catch (err) {
        console.error('[Sync] Erro ao sincronizar template com a nuvem:', err);
      }
    }
  };

  const handleSavePrompt = async (key: keyof SystemPrompts, value: string) => {
    const updated = { ...prompts, [key]: value };
    setPrompts(updated);
    localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(updated));
    showToast(`Prompt padrão atualizado!`);

    const activeKey = masterKey.trim() || localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY) || '';
    if (auth.currentUser && activeKey) {
      try {
        await saveConfigToCloud(templates, updated, activeKey);
      } catch (err) {
        console.error('[Sync] Erro ao sincronizar prompt com a nuvem:', err);
      }
    }
  };

  const handleResetSinglePrompt = async (key: keyof SystemPrompts) => {
    const updated = { ...prompts, [key]: DEFAULT_PROMPTS[key] };
    setPrompts(updated);
    localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(updated));
    showToast(`Prompt restaurado para o original!`);

    const activeKey = masterKey.trim() || localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY) || '';
    if (auth.currentUser && activeKey) {
      try {
        await saveConfigToCloud(templates, updated, activeKey);
      } catch (err) {
        console.error('[Sync] Erro ao sincronizar prompt com a nuvem:', err);
      }
    }
  };

  // Salva template como PADRÃO GLOBAL do sistema (Firebase)
  const handleSaveGlobalTemplate = async (key: keyof SystemTemplates, value: string) => {
    const updated = { ...templates, [key]: value };
    setTemplates(updated);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
    showToast(`Template definido como PADRÃO GLOBAL do sistema!`);

    if (auth.currentUser) {
      try {
        await saveGlobalDefaultConfig(updated, prompts);
      } catch (err: any) {
        console.error('[Sync] Erro ao salvar template global:', err);
        showToast('Erro ao salvar no Firebase: ' + (err.message || ''));
      }
    } else {
      showToast('Aviso: Faça login para sincronizar o padrão global no Firebase.');
    }
  };

  // Salva prompt de IA como PADRÃO GLOBAL do sistema (Firebase)
  const handleSaveGlobalPrompt = async (key: keyof SystemPrompts, value: string) => {
    const updated = { ...prompts, [key]: value };
    setPrompts(updated);
    localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(updated));
    showToast(`Prompt de IA definido como PADRÃO GLOBAL do sistema!`);

    if (auth.currentUser) {
      try {
        await saveGlobalDefaultConfig(templates, updated);
      } catch (err: any) {
        console.error('[Sync] Erro ao salvar prompt global:', err);
        showToast('Erro ao salvar no Firebase: ' + (err.message || ''));
      }
    } else {
      showToast('Aviso: Faça login para sincronizar o padrão global no Firebase.');
    }
  };

  // Salva todas as configurações atuais como Padrão Global no Firebase
  const handleSaveAllAsGlobalDefault = async () => {
    if (!auth.currentUser) {
      alert('Você precisa estar logado para publicar o padrão global na nuvem.');
      return;
    }
    if (window.confirm('Deseja publicar TODOS os templates e prompts atuais como o PADRÃO GLOBAL do sistema?')) {
      try {
        await saveGlobalDefaultConfig(templates, prompts);
        showToast('Padrão Global publicado com sucesso no Firebase!');
      } catch (err: any) {
        showToast('Erro ao publicar padrão global: ' + (err.message || ''));
      }
    }
  };

  // Puxa o Padrão Global do Firebase e aplica
  const handlePullGlobalDefaults = async () => {
    try {
      const globalConfig = await fetchGlobalDefaultConfig();
      if (!globalConfig) {
        showToast('Nenhum padrão global cadastrado no Firebase ainda.');
        return;
      }
      if (globalConfig.templates) {
        setTemplates((prev) => ({ ...prev, ...globalConfig.templates }));
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(globalConfig.templates));
      }
      if (globalConfig.prompts) {
        setPrompts((prev) => ({ ...prev, ...globalConfig.prompts }));
        localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(globalConfig.prompts));
      }
      showToast('Padrão Global do sistema carregado com sucesso!');
    } catch (err: any) {
      showToast('Erro ao carregar padrão global: ' + (err.message || ''));
    }
  };

  // Exportar / Baixar defaults.ts para o repositório GitHub
  const handleExportDefaultsFile = () => {
    downloadDefaultsFile(templates, prompts);
    showToast('Arquivo defaults.ts gerado e baixado!');
  };

  const handleCopyDefaultsCode = async () => {
    await copyDefaultsCodeToClipboard(templates, prompts);
    showToast('Código de defaults.ts copiado para a área de transferência!');
  };

  const getPayloadTemplate = (key: keyof SystemTemplates): string => {
    return templates[key] || templates.payloadCaso || DEFAULT_TEMPLATES.payloadCaso;
  };

  const getCasePayload = (templateKey: keyof SystemTemplates): string => {
    const tpl = getPayloadTemplate(templateKey);
    return buildCaseContextPayload(
      patient,
      qp,
      hma,
      hpp,
      vitals,
      exameFisico,
      examResults,
      aiResults,
      observation,
      tpl
    );
  };

  const handleResetSinglePayloadTemplate = (key: keyof SystemTemplates) => {
    const defaultVal = DEFAULT_TEMPLATES[key] || DEFAULT_TEMPLATES.payloadCaso;
    handleSaveTemplate(key, defaultVal);
    showToast(`Template de dados restaurado para o original!`);
  };

  const handleResetTemplates = async () => {
    setTemplates(DEFAULT_TEMPLATES);
    setPrompts(DEFAULT_PROMPTS);
    localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
    localStorage.removeItem(STORAGE_KEYS.PROMPTS);
    showToast('Templates e prompts restaurados para o padrão.');

    const activeKey = masterKey.trim() || localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY) || '';
    if (auth.currentUser && activeKey) {
      try {
        await saveConfigToCloud(DEFAULT_TEMPLATES, DEFAULT_PROMPTS, activeKey);
      } catch (err) {
        console.error('[Sync] Erro ao sincronizar reset com a nuvem:', err);
      }
    }
  };
  const toggleSusFilter = () => {
    const nextVal = !susFilter;
    setSusFilter(nextVal);
    localStorage.setItem(STORAGE_KEYS.SUS_FILTER, String(nextVal));
  };

  // Unified Save / Update Function
  const saveOrUpdateRecord = (showFeedback = false) => {
    const hasData =
      patient.nome.trim() !== '' ||
      qp.trim() !== '' ||
      hma.trim() !== '' ||
      examResults.trim() !== '' ||
      documents.prontuario.trim() !== '';

    if (!hasData) return;

    const recordToSave: SavedPatientRecord = {
      id: currentRecordId,
      savedAt: new Date().toISOString(),
      patient,
      vitals,
      qp,
      hma,
      hpp,
      exameFisico,
      examResults,
      condutas,
      aiResults,
      observation,
      documents
    };

    setSavedRecords((prevRecords) => {
      const existingIndex = prevRecords.findIndex((r) => r.id === currentRecordId);
      let updated: SavedPatientRecord[];
      if (existingIndex >= 0) {
        updated = [...prevRecords];
        updated[existingIndex] = recordToSave;
      } else {
        updated = [recordToSave, ...prevRecords];
      }
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
      return updated;
    });

    setAutoSaveStatus('salvo');
    if (showFeedback) {
      showToast(patient.nome ? `Atendimento de ${patient.nome} atualizado!` : 'Atendimento salvo com sucesso!');
    }

    // Sincroniza silenciosamente com o Firebase na nuvem
    const activeKey = masterKey.trim() || localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY) || '';
    if (activeKey) {
      saveRecordToCloud(recordToSave, activeKey).catch((err) => {
        console.warn('Erro ao salvar no Firebase:', err);
      });
    }
  };

  // Debounced Auto-Save Effect (triggers 1.5s after any clinical field changes)
  useEffect(() => {
    const hasData =
      patient.nome.trim() !== '' ||
      qp.trim() !== '' ||
      hma.trim() !== '' ||
      condutas.trim() !== '' ||
      examResults.trim() !== '';

    if (!hasData) return;

    setAutoSaveStatus('salvando');
    const timer = setTimeout(() => {
      saveOrUpdateRecord(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [patient, vitals, qp, hma, hpp, exameFisico, examResults, condutas, aiResults, observation, documents]);

  // New Patient reset
  const handleNewPatient = () => {
    if (patient.nome || qp || hma) {
      if (!window.confirm('Iniciar novo atendimento? Os dados do paciente atual já foram salvos automaticamente.')) {
        return;
      }
    }
    setCurrentRecordId(Date.now().toString());
    setPatient({ nome: '', idade: '', sexo: '', peso: '', altura: '' });
    setQp('');
    setHma('');
    setHpp(parseHppText(templates.hpp));
    setVitals({ pa: '', fc: '', fr: '', sat: '', tax: '' });
    setExameFisico(templates.exameFisico);
    setExamResults('');
    setCondutas('');
    setAiResults({});
    setObservation({
      inObservation: false,
      startedAt: undefined,
      revaluationTimeMinutes: 120,
      whatToReevaluate: '',
      clinicalReevaluationText: '',
      conclusionNewHypothesis: '',
      newConducts: ''
    });
    setDocuments({
      prontuario: '',
      receitaInterna: '',
      receitaDomiciliar: '',
      passagemPlantao: '',
      passometro: '',
      evolucao: ''
    });
    setActiveTab('atendimento');
    showToast('Novo atendimento iniciado.');
  };

  const handleManualSave = () => {
    const hasData =
      patient.nome.trim() !== '' ||
      qp.trim() !== '' ||
      hma.trim() !== '' ||
      examResults.trim() !== '' ||
      documents.prontuario.trim() !== '' ||
      condutas.trim() !== '';

    if (!hasData) {
      showToast('Nenhum dado clínico inserido para salvar ainda.');
      return;
    }
    saveOrUpdateRecord(true);
  };

  // Sync All Records to Firebase Cloud
  const handleSyncToCloud = async () => {
    if (!masterKey.trim()) {
      throw new Error('Configure uma senha mestra primeiro.');
    }
    // Envia todos os atendimentos locais para o Firebase
    for (const record of savedRecords) {
      await saveRecordToCloud(record, masterKey.trim());
    }
    // Salva também templates e prompts
    await saveConfigToCloud(templates, prompts, masterKey.trim());
  };

  // Pull All Records from Firebase Cloud
  const handlePullFromCloud = async () => {
    if (!masterKey.trim()) {
      throw new Error('Configure uma senha mestra primeiro.');
    }
    const cloudRecords = await fetchRecordsFromCloud(masterKey.trim());
    if (cloudRecords.length === 0) {
      showToast('Nenhum atendimento encontrado no Firebase para esta senha.');
      return;
    }

    // Mescla atendimentos da nuvem com os locais sem duplicar IDs
    setSavedRecords((prev) => {
      const map = new Map<string, SavedPatientRecord>();
      // Primeiro os locais
      prev.forEach((r) => map.set(r.id, r));
      // Depois substitui ou adiciona os da nuvem
      cloudRecords.forEach((r) => map.set(r.id, r));
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(merged));
      return merged;
    });

    // Baixa configurações se houver
    const cloudConfig = await fetchConfigFromCloud(masterKey.trim());
    if (cloudConfig?.templates) {
      setTemplates(cloudConfig.templates);
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(cloudConfig.templates));
    }
    if (cloudConfig?.prompts) {
      setPrompts(cloudConfig.prompts);
      localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(cloudConfig.prompts));
    }
  };

  const handleSaveMasterKey = (key: string) => {
    setMasterKey(key);
    localStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEY, key);
    showToast('Senha mestra de criptografia salva com sucesso!');
  };

  // Exporta todos os atendimentos e templates em um arquivo JSON de emergencia
  const handleExportLocalBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      records: savedRecords,
      templates,
      prompts
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_prontuario_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Arquivo de backup exportado com sucesso!');
  };

  // Importa e restaura backup a partir de um arquivo JSON
  const handleImportLocalBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.records)) {
        setSavedRecords((prev) => {
          const map = new Map<string, SavedPatientRecord>();
          prev.forEach((r) => map.set(r.id, r));
          parsed.records.forEach((r: SavedPatientRecord) => map.set(r.id, r));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
          );
          localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(merged));
          return merged;
        });
      }
      if (parsed.templates) {
        setTemplates(parsed.templates);
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(parsed.templates));
      }
      if (parsed.prompts) {
        setPrompts(parsed.prompts);
        localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(parsed.prompts));
      }
      showToast('Dados restaurados com sucesso a partir do arquivo!');
    } catch (err: any) {
      alert(`Falha ao ler o arquivo de backup: ${err.message}`);
    }
  };

  // Undo state para exclusão do histórico
  const [lastDeletedRecord, setLastDeletedRecord] = useState<SavedPatientRecord | null>(null);

  const handleDeleteRecord = (id: string) => {
    const toDelete = savedRecords.find((r) => r.id === id);
    if (toDelete) {
      setLastDeletedRecord(toDelete);
    }
    const updated = savedRecords.filter((r) => r.id !== id);
    setSavedRecords(updated);
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
    if (masterKey.trim()) {
      deleteRecordFromCloud(id).catch((err) => console.warn('Erro ao deletar da nuvem:', err));
    }
  };

  const handleRestoreDeletedRecord = () => {
    if (!lastDeletedRecord) return;
    const restored = [lastDeletedRecord, ...savedRecords];
    setSavedRecords(restored);
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(restored));
    if (masterKey.trim()) {
      saveRecordToCloud(lastDeletedRecord, masterKey).catch((err) => console.warn(err));
    }
    setLastDeletedRecord(null);
  };

  const handleLoadRecord = (rec: SavedPatientRecord) => {
    setCurrentRecordId(rec.id);
    setPatient(rec.patient);
    setVitals(rec.vitals);
    setQp(rec.qp);
    setHma(rec.hma);
    setHpp(rec.hpp);
    setExameFisico(rec.exameFisico);
    setExamResults(rec.examResults || '');
    setCondutas(rec.condutas || '');
    setAiResults(rec.aiResults || {});
    setObservation(rec.observation || {
      inObservation: false,
      revaluationTimeMinutes: 120,
      whatToReevaluate: '',
      clinicalReevaluationText: '',
      conclusionNewHypothesis: '',
      newConducts: ''
    });
    setDocuments(rec.documents || {
      prontuario: '',
      receitaInterna: '',
      receitaDomiciliar: '',
      passagemPlantao: '',
      passometro: '',
      evolucao: ''
    });
    showToast(`Atendimento de ${rec.patient.nome || 'paciente'} carregado.`);
  };

  // AI Runners
  const runAiHma = async () => {
    setAiLoading((prev) => ({ ...prev, hma: true }));
    try {
      const jsonExample = `{"hmaRefinada": "texto fluido e técnico...", "perguntasFaltantes": ["Pergunta 1", "Pergunta 2"]}`;
      const payload = getCasePayload('payloadHma');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.hma,
        payload,
        'Analise a QP e HMA informadas. Melhore a redação da HMA e liste o que faltou perguntar.',
        jsonExample
      );

      const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
      setAiResults((prev) => ({
        ...prev,
        hmaSuggestion: parsed.hmaRefinada || '',
        hmaMissingQuestions: parsed.perguntasFaltantes || []
      }));
      showToast('Sugestão de HMA gerada pela IA abaixo do campo.');
    } catch (err: any) {
      alert(`Falha na IA (HMA): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, hma: false }));
    }
  };

  const runAiExameFisico = async () => {
    setAiLoading((prev) => ({ ...prev, exame: true }));
    try {
      const jsonExample = `{"exameRefinado": "BEG, (...)", "manobrasFaltantes": ["Manobra 1", "Manobra 2"]}`;
      const payload = getCasePayload('payloadExameFisico');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.exameFisico,
        payload,
        'Analise o exame físico e a queixa. Refine a redação mantendo o padrão e indique partes ou manobras faltantes.',
        jsonExample
      );

      const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
      setAiResults((prev) => ({
        ...prev,
        physicalExamSuggestion: parsed.exameRefinado || '',
        physicalExamMissingManeuvers: parsed.manobrasFaltantes || []
      }));
      showToast('Sugestão de exame físico gerada pela IA abaixo do campo.');
    } catch (err: any) {
      alert(`Falha na IA (Exame Físico): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, exame: false }));
    }
  };

  const runAiDiagnostico = async () => {
    setAiLoading((prev) => ({ ...prev, diagnostico: true }));
    try {
      const jsonExample = `{
  "hipotesePrincipal": "Cistite Aguda Não Complicada",
  "rankingHipoteses": [
    {"nome": "Cistite Aguda Não Complicada", "tipo": "Principal", "prob": "Alta"},
    {"nome": "Pielonefrite Aguda", "tipo": "Diferencial", "prob": "Média"},
    {"nome": "Vaginite Infecciosa", "tipo": "Diferencial", "prob": "Baixa"},
    {"nome": "Urolitíase", "tipo": "Diferencial", "prob": "Baixa"}
  ],
  "diagnosticosDiferenciais": [
    {"nome": "Pielonefrite Aguda", "prob": "Média"},
    {"nome": "Vaginite Infecciosa", "prob": "Baixa"},
    {"nome": "Urolitíase", "prob": "Baixa"}
  ],
  "cids": [
    {"cid": "N30.0", "desc": "Cistite aguda", "prob": "Alta"},
    {"cid": "N39.0", "desc": "Infecção do trato urinário de localização não especificada", "prob": "Média"},
    {"cid": "N10", "desc": "Nefrite túbulo-intersticial aguda (Pielonefrite)", "prob": "Baixa"},
    {"cid": "N20.0", "desc": "Cálculo do rim / urolitíase", "prob": "Baixa"},
    {"cid": "R10.2", "desc": "Dor pélvica e perineal", "prob": "Baixa"}
  ],
  "notificacaoCompulsoria": false,
  "detalhesNotificacao": "",
  "escoresClinicos": [
    {"name": "Centor / McIsaac", "score": "0 pontos", "interpretation": "Baixo risco de infecção estreptocócica"}
  ]
}`;
      const payload = getCasePayload('payloadDiagnostico');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.diagnostico,
        payload,
        'Elabore a hipótese principal, ranking de hipóteses (principal e diferenciais) com probabilidade (Alta, Média ou Baixa), ranking de 5 CIDs com probabilidade, verificação de notificação compulsória e escores clínicos pertinentes.',
        jsonExample
      );

      const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());

      // Monta o ranking estruturado de hipóteses
      let rankingHipoteses = parsed.rankingHipoteses || [];
      if (!rankingHipoteses.length && parsed.hipotesePrincipal) {
        rankingHipoteses.push({
          nome: parsed.hipotesePrincipal,
          tipo: 'Principal',
          prob: 'Alta'
        });
        if (Array.isArray(parsed.diagnosticosDiferenciais)) {
          parsed.diagnosticosDiferenciais.forEach((item: any, idx: number) => {
            if (typeof item === 'string') {
              rankingHipoteses.push({
                nome: item,
                tipo: 'Diferencial',
                prob: idx === 0 ? 'Média' : 'Baixa'
              });
            } else if (item && typeof item === 'object') {
              rankingHipoteses.push({
                nome: item.nome || item.name || item.hipotese || '',
                tipo: 'Diferencial',
                prob: item.prob || item.probabilidade || (idx === 0 ? 'Média' : 'Baixa')
              });
            }
          });
        }
      }

      const diffStrings = rankingHipoteses
        .filter((h: any) => h.tipo?.toLowerCase() !== 'principal' && h.nome !== parsed.hipotesePrincipal)
        .map((h: any) => h.nome);

      const cids = parsed.cids || [];
      const defaultCid = cids.length > 0 ? `${cids[0].cid} - ${cids[0].desc}` : undefined;

      setAiResults((prev) => ({
        ...prev,
        mainHypothesis: parsed.hipotesePrincipal || prev.mainHypothesis,
        hypothesisRankings: rankingHipoteses,
        differentialDiagnoses: diffStrings.length ? diffStrings : (parsed.diagnosticosDiferenciais || []),
        cidRankings: cids,
        selectedCid: prev.selectedCid || defaultCid,
        isCompulsoryNotification: !!parsed.notificacaoCompulsoria,
        compulsoryDetails: parsed.detalhesNotificacao || '',
        clinicalScores: parsed.escoresClinicos || []
      }));
      showToast('Diagnósticos e CID gerados pela IA!');
    } catch (err: any) {
      alert(`Falha na IA (Diagnóstico): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, diagnostico: false }));
    }
  };

  const runAiConduta = async () => {
    setAiLoading((prev) => ({ ...prev, conduta: true }));
    try {
      const jsonExample = `{
  "medicacoesUnidade": ["Cetoprofeno 100mg EV em SF 0,9% 100ml", "Dipirona 1g EV"],
  "medicacoesCasa": ["Fosfomicina Trometamol 3g dose única VO", "Dipirona 500mg VO até de 6/6h se dor"],
  "disclaimers": [
    {"med": "Cetoprofeno 100mg", "type": "warning", "note": "Cuidado em idoso frágil e nefropatas (risco renal)."},
    {"med": "Dipirona", "type": "contraindication", "note": "ATENÇÃO: Paciente relata alergia se houver, não prescrever!"}
  ],
  "alertaProfilaxiaVacinal": "Avaliar VAT se ferimento perfurocortante.",
  "examesLaboratorio": "EAS / Urina 1, Urocultura com antibiograma se falha",
  "examesImagem": "Sem indicação no momento",
  "desfechoSugerido": "alta",
  "motivoDesfecho": "Boa resposta clínica esperada, ausência de sinais de sepse ou abdome cirúrgico.",
  "encaminhamentoUbs": true,
  "motivoEncaminhamento": "Revisão e seguimento de urocultura na UBS de referência.",
  "atestadoNecessario": true,
  "diasAtestado": "1 dia",
  "motivoAtestado": "Repouso e realização de medicações na fase álgica aguda."
}`;
      const instruction = `Gere as condutas com prescrições (Unidade vs Domiciliar), checagem estrita de alergias conforme a HPP, avisos para idoso frágil, escores, profilaxia de tétano/raiva se aplicável, exames e desfecho clínico. ${
        susFilter ? 'PRIORIZE FORTEMENTE FÁRMACOS DA RENAME / FARMÁCIA BÁSICA DO SUS.' : ''
      }`;

      const payload = getCasePayload('payloadConduta');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.conduta,
        payload,
        instruction,
        jsonExample
      );

      const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
      setAiResults((prev) => ({
        ...prev,
        unitMedications: parsed.medicacoesUnidade || [],
        homeMedications: parsed.medicacoesCasa || [],
        medicationDisclaimers: parsed.disclaimers || [],
        tetanusRabiesAlert: parsed.alertaProfilaxiaVacinal || '',
        orderedLabs: parsed.examesLaboratorio || '',
        orderedImages: parsed.examesImagem || '',
        clinicalOutcome: parsed.desfechoSugerido || 'alta',
        outcomeReason: parsed.motivoDesfecho || '',
        referralNeeded: !!parsed.encaminhamentoUbs,
        referralReason: parsed.motivoEncaminhamento || '',
        medicalLeaveNeeded: !!parsed.atestadoNecessario,
        medicalLeaveDays: parsed.diasAtestado || '',
        medicalLeaveReason: parsed.motivoAtestado || ''
      }));
      showToast('Condutas, prescrições e alertas de segurança gerados!');
    } catch (err: any) {
      alert(`Falha na IA (Conduta): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, conduta: false }));
    }
  };

  const runAiMelhorarCondutas = async () => {
    setAiLoading((prev) => ({ ...prev, melhorarCondutas: true }));
    try {
      const jsonExample = `{"condutasRefinadas": "- Dipirona 1g EV diluído em 100ml SF 0,9% agora em 20 min\\n- Hidratação com SF 0,9% 500ml EV\\n- Reavaliação clínica e sinais vitais após término das medicações"}`;
      const payload = `${getCasePayload('payloadConduta')}\n\n=== TEXTO ATUAL DE CONDUTAS DIGITADO PELO MÉDICO ===\n${condutas || 'Sem condutas descritas ainda'}`;
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.melhorarCondutas || DEFAULT_PROMPTS.melhorarCondutas || 'Aprimore a redação médica das condutas.',
        payload,
        'Analise todo o caso e o texto digitado em Condutas. Refine e melhore a redação médica das condutas mantendo padrão hospitalar/ambulatorial claro e organizado.',
        jsonExample
      );

      const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
      setAiResults((prev) => ({
        ...prev,
        condutasSuggestion: parsed.condutasRefinadas || ''
      }));
      showToast('Sugestão de condutas gerada pela IA abaixo do campo!');
    } catch (err: any) {
      alert(`Falha na IA (Condutas): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, melhorarCondutas: false }));
    }
  };

  const runAiOrientacoes = async () => {
    setAiLoading((prev) => ({ ...prev, orientacoes: true }));
    try {
      const jsonExample = `{
  "orientacoesProntuario": "Orientado repouso relativo, hidratação oral contínua e seguimento com médico assistente / UBS.",
  "sinaisAlarmeProntuario": "Febre persistente acima de 38,5°C refratária a antitérmicos, piora acentuada da dor, vômitos incoercíveis, síncope ou dispneia.",
  "orientacoesReceita": "Mantenha repouso em casa e tome bastante água e sucos naturais. Tome as medicações receitadas rigorosamente nos horários indicados.",
  "sinaisAlarmeReceita": "Retorne imediatamente ao pronto atendimento se apresentar: febre alta que não baixa com os remédios, dor intensa que piore, vômitos que impeçam beber água ou falta de ar."
}`;
      const payload = getCasePayload('payloadOrientacoes');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.orientacoes,
        payload,
        'Gere as orientações gerais e sinais de alarme em 4 campos distintos: orientações para prontuário, sinais de alarme para prontuário, orientações para receita e sinais de alarme para receita.',
        jsonExample
      );

      const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
      setAiResults((prev) => ({
        ...prev,
        techOrientations: parsed.orientacoesProntuario || parsed.textoTecnico || '',
        techAlarmSignals: parsed.sinaisAlarmeProntuario || '',
        layOrientations: parsed.orientacoesReceita || parsed.textoLeigo || '',
        layAlarmSignals: parsed.sinaisAlarmeReceita || ''
      }));
      showToast('Orientações e sinais de alarme gerados pela IA!');
    } catch (err: any) {
      alert(`Falha na IA (Orientações): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, orientacoes: false }));
    }
  };

  const runAiPassagemPlantao = async () => {
    setAiLoading((prev) => ({ ...prev, passagem: true }));
    try {
      const payload = getCasePayload('payloadPassagemPlantao');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.passagemPlantao,
        payload,
        'Gere a passagem de caso oral sintetizada, direta ao ponto, para passagem de plantão.'
      );
      setDocuments((prev) => ({ ...prev, passagemPlantao: response.trim() }));
      showToast('Passagem de plantão oral gerada!');
    } catch (err: any) {
      alert(`Falha na IA (Passagem de plantão): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, passagem: false }));
    }
  };

  const runAiPassometro = async () => {
    setAiLoading((prev) => ({ ...prev, passometro: true }));
    try {
      const payload = getCasePayload('payloadPassometro');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.passometro,
        payload,
        'Preencha o passômetro do paciente de forma ultra-objetiva com base em todo o caso.'
      );
      setDocuments((prev) => ({ ...prev, passometro: response.trim() }));
      showToast('Passômetro gerado pela IA!');
    } catch (err: any) {
      alert(`Falha na IA (Passômetro): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, passometro: false }));
    }
  };

  const runAiReavaliacao = async () => {
    setAiLoading((prev) => ({ ...prev, reavaliacao: true }));
    try {
      const jsonExample = `{
  "reavaliacaoRefinada": "Paciente mantido em repouso e sob analgesia venosa. No momento, refere melhora expressiva do quadro álgico (EVA 2/10), nega novos picos febris ou episódios de êmese. Aceitando hidratação oral. Mantém estabilidade hemodinâmica.",
  "checagensFaltantes": ["Aferir novos sinais vitais de controle", "Palpação abdominal de controle pós-analgesia", "Checar débito urinário"]
}`;
      const payload = getCasePayload('payloadReavaliacao');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.reavaliacao,
        payload,
        'Analise a evolução e reavaliação clínica. Estruture a redação e aponte checagens essenciais pendentes.',
        jsonExample
      );

      const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
      setAiResults((prev) => ({
        ...prev,
        reevaluationSuggestion: parsed.reavaliacaoRefinada || '',
        missingReevaluationChecks: parsed.checagensFaltantes || []
      }));
      showToast('Sugestão de reavaliação gerada pela IA abaixo do campo.');
    } catch (err: any) {
      alert(`Falha na IA (Reavaliação): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, reavaliacao: false }));
    }
  };

  const runAiConclusaoObs = async () => {
    setAiLoading((prev) => ({ ...prev, conclusaoObs: true }));
    try {
      const jsonExample = `{
  "novaHipotese": "Cistite aguda não complicada com boa resposta inicial a sintomáticos e hidratação.",
  "novasCondutas": "- Alta médica da observação com receitas e orientações domiciliares.\\n- Fosfomicina 3g dose única VO hoje à noite.\\n- Dipirona 500mg VO de 6/6h se dor ou febre.\\n- Manter hidratação vigorosa e retorno à UBS para seguimento.\\n- Sinais de alarme orientados (febre refratária, dor lombar ou vômitos)."
}`;
      const payload = getCasePayload('payloadConclusaoObs');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.conclusaoObs,
        payload,
        'Analise o caso, medicações feitas, exames realizados e reavaliação clínica para indicar a nova hipótese e as novas condutas.',
        jsonExample
      );

      const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
      const novaHipotese = parsed.novaHipotese || parsed.novaHipótese || parsed.conclusao || '';
      const novasCondutas = parsed.novasCondutas || parsed.novasCondutasTexto || '';

      setAiResults((prev) => ({
        ...prev,
        conclusionHypothesisSuggestion: novaHipotese,
        newConductsSuggestion: novasCondutas
      }));
      showToast('Sugestão de nova hipótese e condutas gerada abaixo dos campos.');
    } catch (err: any) {
      alert(`Falha na IA (Conclusão da Observação): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, conclusaoObs: false }));
    }
  };

  // Observation actions
  const toggleObservation = () => {
    const nextState = !observation.inObservation;
    setObservation((prev) => ({
      ...prev,
      inObservation: nextState,
      startedAt: nextState ? (prev.startedAt || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) : undefined
    }));
    if (nextState) {
      setActiveTab('evolucao');
      showToast('Paciente colocado em observação clínica.');
    } else {
      showToast('Observação clínica desativada.');
    }
  };

  // Undo state para liberação de leito de observação
  const [lastDischargedRecordId, setLastDischargedRecordId] = useState<string | null>(null);

  const handleDischargeFromObservation = (recordId: string) => {
    setLastDischargedRecordId(recordId);
    if (recordId === currentRecordId) {
      setObservation((prev) => ({ ...prev, inObservation: false }));
    }
    setSavedRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.id === recordId) {
          return {
            ...r,
            observation: {
              ...r.observation,
              inObservation: false
            }
          };
        }
        return r;
      });
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
      return updated;
    });
  };

  const handleRestoreDischargedPatient = () => {
    if (!lastDischargedRecordId) return;
    if (lastDischargedRecordId === currentRecordId) {
      setObservation((prev) => ({ ...prev, inObservation: true }));
    }
    setSavedRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.id === lastDischargedRecordId) {
          return {
            ...r,
            observation: {
              ...r.observation,
              inObservation: true
            }
          };
        }
        return r;
      });
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
      return updated;
    });
    setLastDischargedRecordId(null);
  };

  // Active observation queue
  const savedObsPatients = savedRecords.filter((r) => r.observation && r.observation.inObservation);
  const isCurrentInObs = observation.inObservation;

  const activeObsPatients: SavedPatientRecord[] = [
    ...(isCurrentInObs
      ? [
          {
            id: currentRecordId,
            savedAt: new Date().toISOString(),
            patient,
            vitals,
            qp,
            hma,
            hpp,
            exameFisico,
            examResults,
            aiResults,
            observation,
            documents
          }
        ]
      : []),
    ...savedObsPatients.filter((r) => r.id !== currentRecordId)
  ];

  // Fila de observação ordenada por urgência (mais atrasados ou com menor tempo restante primeiro)
  const sortedActiveObsPatients = [...activeObsPatients].sort((a, b) => {
    const cdA = computeObservationCountdown(
      a.observation?.startedAt,
      a.observation?.revaluationTimeMinutes || 120
    );
    const cdB = computeObservationCountdown(
      b.observation?.startedAt,
      b.observation?.revaluationTimeMinutes || 120
    );
    return cdA.remaining - cdB.remaining;
  });

  // Verifica em tempo real se há pacientes que já passaram do horário de reavaliação
  const overdueCount = activeObsPatients.filter((r) => {
    const cd = computeObservationCountdown(
      r.observation.startedAt,
      r.observation.revaluationTimeMinutes || 120
    );
    return cd.status === 'overdue';
  }).length;
  const hasOverdueObservation = overdueCount > 0;

  // Helper para substituir as 4 tags de orientações e sinais de alarme em qualquer documento
  const replaceOrientationAndAlarmTags = (templateStr: string): string => {
    const techOrient = aiResults.techOrientations?.trim() || '';
    const techAlarm = aiResults.techAlarmSignals?.trim() || '';
    const layOrient = aiResults.layOrientations?.trim() || '';
    const layAlarm = aiResults.layAlarmSignals?.trim() || '';

    const hasSeparateTechAlarm = /\{\{(alarme_prontuario|sinais_alarme_prontuario|alarme_tecnico|sinais_alarme_tecnicos)\}\}/i.test(templateStr);

    let output = templateStr;

    // 1. Orientações Prontuário (Técnicas)
    output = output.replace(/\{\{(orientacoes_prontuario|orientacao_prontuario)\}\}/gi, techOrient);

    // 2. Sinais de Alarme Prontuário (Técnicos)
    output = output.replace(/\{\{(alarme_prontuario|sinais_alarme_prontuario|alarme_tecnico|sinais_alarme_tecnicos)\}\}/gi, techAlarm);

    // Retrocompatibilidade para {{ORIENTACOES_TECNICAS}}
    if (hasSeparateTechAlarm) {
      output = output.replace(/\{\{(orientacoes_tecnicas|orientacao_tecnica)\}\}/gi, techOrient);
    } else {
      const combinedTech = [techOrient, techAlarm].filter(Boolean).join('\n\n');
      output = output.replace(/\{\{(orientacoes_tecnicas|orientacao_tecnica)\}\}/gi, combinedTech);
    }

    // 3. Orientações Paciente (Leigas / Receita)
    output = output.replace(/\{\{(orientacoes_paciente|orientacao_paciente|orientacoes_receita|orientacoes_leigas)\}\}/gi, layOrient);

    // 4. Sinais de Alarme Paciente (Leigos / Receita)
    output = output.replace(/\{\{(alarme_paciente|sinais_alarme_paciente|alarme_receita|sinais_alarme_leigos)\}\}/gi, layAlarm);

    return output;
  };

  // Generate Evolution Text from Template
  const generateEvolucaoDocument = () => {
    const now = new Date();
    const dataHora = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const medsUnidade = (aiResults.unitMedications || []).map((m, i) => `${i + 1}. ${m}`).join('\n') || 'Nenhuma medicação administrada registrada';

    let text = templates.evolucao
      .replace('{{DATA_HORA}}', dataHora)
      .replace('{{NOME}}', patient.nome || 'Não informado')
      .replace('{{IDADE}}', patient.idade ? `${patient.idade} anos` : 'Não informada')
      .replace('{{SEXO}}', patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Feminino' : 'Não informado')
      .replace('{{HIPOTESE_INICIAL}}', aiResults.mainHypothesis || 'Não informada')
      .replace('{{MEDICACOES_UNIDADE}}', medsUnidade)
      .replace('{{RESULTADOS_EXAMES}}', examResults || 'Sem exames adicionais no momento.')
      .replace('{{REAVALIACAO_TEXTO}}', observation.clinicalReevaluationText || 'Paciente reavaliado em leito de observação, mantendo estabilidade clínica.')
      .replace('{{NOVA_HIPOTESE}}', observation.conclusionNewHypothesis || aiResults.mainHypothesis || 'Quadro clínico inalterado.')
      .replace('{{NOVAS_CONDUTAS}}', observation.newConducts || '- Alta clínica orientada com receitas e orientações domiciliares.');

    text = replaceOrientationAndAlarmTags(text);
    setDocuments((prev) => ({ ...prev, evolucao: text }));
    showToast('Evolução médica compilada com sucesso!');
  };

  // Montador único e centralizado para qualquer documento
  const buildDocumentContent = (docType: 'prontuario' | 'receitaInterna' | 'receitaDomiciliar' | 'passagemPlantao' | 'passometro'): string => {
    const today = new Date().toLocaleDateString('pt-BR');
    if (docType === 'prontuario') {
      return replaceOrientationAndAlarmTags(
        templates.prontuario
          .replace('{{NOME}}', patient.nome || 'Paciente')
          .replace('{{IDADE}}', patient.idade || '--')
          .replace('{{SEXO}}', patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Feminino' : patient.sexo || 'Não informado')
          .replace('{{DATA}}', today)
          .replace('{{PESO}}', patient.peso || '--')
          .replace('{{ALTURA}}', patient.altura || '--')
          .replace('{{QP}}', qp || 'Não informada')
          .replace('{{HMA}}', hma || 'Não informada')
          .replace('{{ALERGIAS}}', hpp.alergias)
          .replace('{{COMORBIDADES}}', hpp.comorbidades)
          .replace('{{MUC}}', hpp.muc)
          .replace('{{CIRURGIAS}}', hpp.cirurgias)
          .replace('{{TABAGISMO}}', hpp.tabagismo)
          .replace('{{ETILISMO}}', hpp.etilismo)
          .replace('{{PA}}', vitals.pa || '--')
          .replace('{{FC}}', vitals.fc || '--')
          .replace('{{FR}}', vitals.fr || '--')
          .replace('{{SAT}}', vitals.sat || '--')
          .replace('{{TAX}}', vitals.tax || '--')
          .replace('{{EXAME_FISICO}}', exameFisico || 'Não informado')
          .replace('{{HIPOTESE}}', aiResults.mainHypothesis || 'A esclarecer')
          .replace('{{DIFERENCIAIS}}', aiResults.differentialDiagnoses?.length ? `Diferenciais: ${aiResults.differentialDiagnoses.join(' • ')}` : '')
          .replace('{{CID}}', aiResults.selectedCid ? `CID: ${aiResults.selectedCid}` : '')
          .replace('{{CIDS}}', aiResults.selectedCid ? `CID: ${aiResults.selectedCid}` : '')
          .replace('{{RESULTADOS_EXAMES}}', examResults || 'Nenhum resultado informado')
          .replace('{{CONDUTAS}}', condutas.trim() || 'Condutas sintomáticas e orientações')
      );
    }
    if (docType === 'receitaInterna') {
      const medsUnidadeText = (aiResults.unitMedications || []).join('\n') || 'Nenhuma medicação prescrita na unidade.';
      const examesSolicitados = [aiResults.orderedLabs, aiResults.orderedImages].filter(Boolean).join('\n') || 'Nenhum exame solicitado.';
      return replaceOrientationAndAlarmTags(
        templates.receitaInterna
          .replace('{{NOME}}', patient.nome || 'Paciente')
          .replace('{{IDADE}}', patient.idade || '--')
          .replace('{{SEXO}}', patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Feminino' : patient.sexo || 'Não informado')
          .replace('{{DATA}}', today)
          .replace('{{MEDICACOES_UNIDADE}}', medsUnidadeText)
          .replace('{{EXAMES_SOLICITADOS}}', examesSolicitados)
      );
    }
    if (docType === 'receitaDomiciliar') {
      const medsCasaText = (aiResults.homeMedications || []).join('\n\n') || 'Nenhuma medicação domiciliar.';
      return replaceOrientationAndAlarmTags(
        templates.receitaDomiciliar
          .replace('{{NOME}}', patient.nome || 'Paciente')
          .replace('{{IDADE}}', patient.idade || '--')
          .replace('{{SEXO}}', patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Feminino' : patient.sexo || 'Não informado')
          .replace('{{DATA}}', today)
          .replace('{{MEDICACOES_CASA}}', medsCasaText)
      );
    }
    if (docType === 'passagemPlantao') {
      return replaceOrientationAndAlarmTags(
        templates.passagemPlantao
          .replace('{{NOME}}', patient.nome || 'Paciente')
          .replace('{{IDADE}}', patient.idade || '--')
          .replace('{{SEXO}}', patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Feminino' : 'Não informado')
          .replace('{{DATA}}', today)
          .replace('{{QP}}', qp || 'Não informada')
          .replace('{{HMA_RESUMO}}', hma ? hma.slice(0, 150) + (hma.length > 150 ? '...' : '') : 'Não informada')
          .replace('{{PA}}', vitals.pa || '--')
          .replace('{{FC}}', vitals.fc || '--')
          .replace('{{TAX}}', vitals.tax || '--')
          .replace('{{EXAME_RESUMO}}', exameFisico ? exameFisico.slice(0, 100) + '...' : 'Sem alterações descritas')
          .replace('{{HIPOTESE}}', aiResults.mainHypothesis || 'A esclarecer')
          .replace('{{CONDUTAS_UNIDADE}}', (aiResults.unitMedications || []).join(', ') || condutas || 'Sintomáticos')
          .replace('{{PENDENCIAS}}', observation.whatToReevaluate || examResults ? 'Conferir exames' : 'Reavaliação clínica')
          .replace('{{STATUS}}', observation.inObservation ? 'Em observação clínica' : 'Em atendimento')
      );
    }
    if (docType === 'passometro') {
      return replaceOrientationAndAlarmTags(
        templates.passometro
          .replace('{{NOME}}', patient.nome || 'Paciente')
          .replace('{{IDADE}}', patient.idade || '--')
          .replace('{{SEXO}}', patient.sexo === 'M' ? 'M' : patient.sexo === 'F' ? 'F' : patient.sexo || '')
          .replace('{{DATA}}', today)
          .replace('{{HIPOTESE}}', aiResults.mainHypothesis || 'A esclarecer')
          .replace('{{CONDUTAS_FEITAS}}', (aiResults.unitMedications || []).join(', ') || 'Sintomáticos')
          .replace('{{PENDENCIAS}}', observation.whatToReevaluate || examResults ? 'Conferir exames' : 'Reavaliação clínica')
          .replace('{{SINAIS_ALERTA}}', 'Piora hemodinâmica ou dor refratária')
      );
    }
    return '';
  };

  // Compile All Final Documents (Preencher Tudo)
  const compileAllDocuments = () => {
    const prontuario = buildDocumentContent('prontuario');
    const receitaInterna = buildDocumentContent('receitaInterna');
    const receitaDomiciliar = buildDocumentContent('receitaDomiciliar');
    const passagemPlantao = buildDocumentContent('passagemPlantao');
    const passometro = buildDocumentContent('passometro');

    setDocuments((prev) => ({
      ...prev,
      prontuario,
      receitaInterna,
      receitaDomiciliar,
      passagemPlantao,
      passometro
    }));

    setActiveTab('documentos');
    showToast('Todos os documentos foram compilados!');
  };

  const compileSingleDocument = (docType: 'prontuario' | 'receitaInterna' | 'receitaDomiciliar' | 'passagemPlantao' | 'passometro') => {
    const compiled = buildDocumentContent(docType);
    setDocuments((prev) => ({ ...prev, [docType]: compiled }));
    const titles: Record<string, string> = {
      prontuario: 'Prontuário',
      receitaInterna: 'Prescrição interna',
      receitaDomiciliar: 'Receituário domiciliar',
      passagemPlantao: 'Passagem de plantão',
      passometro: 'Passômetro'
    };
    showToast(`${titles[docType] || 'Documento'} compilado!`);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#191919] text-slate-800 dark:text-[#d4d4d4] flex font-sans transition-colors duration-150 antialiased selection:bg-ice-500/20">
      {/* Toast Notification - Apenas erros críticos */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#252525] text-white border border-rose-500/40 text-xs font-medium px-3.5 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* NOTION-STYLE SIDEBAR                                          */}
      {/* ------------------------------------------------------------- */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-16 md:translate-x-0'
        } shrink-0 bg-[#fbfbfa] dark:bg-[#202020] border-r border-[#ececeb] dark:border-[#2e2e2e] flex flex-col justify-between transition-all duration-200 select-none z-30 sticky top-0 h-screen overflow-hidden`}
      >
        {/* Top: App Brand & Toggle */}
        <div className="flex flex-col">
          <div className="p-3 border-b border-[#ececeb] dark:border-[#2e2e2e] flex items-center justify-between min-h-[53px]">
            {sidebarOpen ? (
              <div className="flex items-center gap-2.5 px-1 overflow-hidden">
                <span className="w-6 h-6 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-black shadow-xs shrink-0">
                  P
                </span>
                <div className="flex flex-col leading-tight truncate">
                  <span className="font-semibold text-xs tracking-tight text-slate-900 dark:text-white truncate">
                    Prontuário Automatizado
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <span className="w-6 h-6 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-black shadow-xs">
                  P
                </span>
              </div>
            )}

            {/* Collapse toggle (visible on wide screens) */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-[#ececeb] dark:hover:bg-[#2e2e2e] transition-colors"
              title={sidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Action: Novo Atendimento */}
          <div className="p-2 border-b border-[#ececeb] dark:border-[#2e2e2e]">
            <button
              type="button"
              onClick={handleNewPatient}
              className={`w-full flex items-center ${
                sidebarOpen ? 'justify-start px-2.5 py-1.5' : 'justify-center p-2'
              } rounded-md text-xs font-medium text-slate-700 dark:text-neutral-200 hover:bg-[#efefee] dark:hover:bg-[#2a2a2a] transition-colors gap-2`}
              title="Novo Atendimento (Limpar)"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400 shrink-0" />
              {sidebarOpen && <span className="truncate">Novo Atendimento</span>}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-0.5">
            {/* 1. Atendimento Clínico */}
            <button
              type="button"
              onClick={() => setActiveTab('atendimento')}
              className={`w-full flex items-center ${
                sidebarOpen ? 'justify-between px-2.5 py-1.5' : 'justify-center p-2'
              } rounded-md text-xs font-medium transition-colors ${
                activeTab === 'atendimento'
                  ? 'bg-[#ececeb] dark:bg-[#2a2a2a] text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-neutral-400 hover:bg-[#efefee] dark:hover:bg-[#262626] hover:text-slate-900 dark:hover:text-white'
              }`}
              title="1. Atendimento Clínico"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Stethoscope className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400 shrink-0" />
                {sidebarOpen && <span className="truncate">Atendimento Clínico</span>}
              </div>
              {sidebarOpen && patient.nome && (
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal truncate max-w-[70px]">
                  {patient.nome.split(' ')[0]}
                </span>
              )}
            </button>

            {/* 2. Prontuário & Documentos */}
            <button
              type="button"
              onClick={() => setActiveTab('documentos')}
              className={`w-full flex items-center ${
                sidebarOpen ? 'justify-between px-2.5 py-1.5' : 'justify-center p-2'
              } rounded-md text-xs font-medium transition-colors ${
                activeTab === 'documentos'
                  ? 'bg-[#ececeb] dark:bg-[#2a2a2a] text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-neutral-400 hover:bg-[#efefee] dark:hover:bg-[#262626] hover:text-slate-900 dark:hover:text-white'
              }`}
              title="2. Prontuário & Documentos"
            >
              <div className="flex items-center gap-2.5 truncate">
                <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400 shrink-0" />
                {sidebarOpen && <span className="truncate">Prontuário & Receitas</span>}
              </div>
            </button>

            {/* 3. Evolução Médica */}
            <button
              type="button"
              onClick={() => setActiveTab('evolucao')}
              className={`w-full flex items-center ${
                sidebarOpen ? 'justify-between px-2.5 py-1.5' : 'justify-center p-2'
              } rounded-md text-xs font-medium transition-colors ${
                activeTab === 'evolucao'
                  ? 'bg-[#ececeb] dark:bg-[#2a2a2a] text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-neutral-400 hover:bg-[#efefee] dark:hover:bg-[#262626] hover:text-slate-900 dark:hover:text-white'
              }`}
              title="3. Evolução Médica"
            >
              <div className="flex items-center gap-2.5 truncate">
                <ClipboardList className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400 shrink-0" />
                {sidebarOpen && <span className="truncate">Evolução Médica</span>}
              </div>
            </button>

            <div className="pt-2 pb-1">
              <div className="border-t border-[#ececeb] dark:border-[#2e2e2e] my-1" />
              {sidebarOpen && (
                <span className="px-2.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-neutral-500">
                  Setores
                </span>
              )}
            </div>

            {/* Reavaliações (Dedicado) */}
            <button
              type="button"
              onClick={() => setActiveTab('observacao')}
              className={`w-full flex items-center ${
                sidebarOpen ? 'justify-between px-2.5 py-1.5' : 'justify-center p-2'
              } rounded-md text-xs font-medium transition-colors ${
                hasOverdueObservation
                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 animate-pulse-slow font-semibold shadow-2xs'
                  : activeTab === 'observacao'
                  ? 'bg-[#ececeb] dark:bg-[#2a2a2a] text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-neutral-400 hover:bg-[#efefee] dark:hover:bg-[#262626] hover:text-slate-900 dark:hover:text-white'
              }`}
              title={hasOverdueObservation ? `Atenção: ${overdueCount} paciente(s) com reavaliação atrasada!` : "Reavaliações"}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Bed className={`w-3.5 h-3.5 shrink-0 ${hasOverdueObservation ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-neutral-400'}`} />
                {sidebarOpen && <span className="truncate">Reavaliações</span>}
              </div>
              {activeObsPatients.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium shrink-0 border ${
                  hasOverdueObservation
                    ? 'bg-rose-500 text-white border-rose-600 font-bold'
                    : 'bg-[#ececeb] dark:bg-[#333] text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-[#444]'
                }`}>
                  {activeObsPatients.length}
                </span>
              )}
            </button>

            {/* Histórico Geral (Dedicado) */}
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`w-full flex items-center ${
                sidebarOpen ? 'justify-between px-2.5 py-1.5' : 'justify-center p-2'
              } rounded-md text-xs font-medium transition-colors ${
                activeTab === 'historico'
                  ? 'bg-[#ececeb] dark:bg-[#2a2a2a] text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-neutral-400 hover:bg-[#efefee] dark:hover:bg-[#262626] hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Histórico Geral"
            >
              <div className="flex items-center gap-2.5 truncate">
                <History className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400 shrink-0" />
                {sidebarOpen && <span className="truncate">Histórico</span>}
              </div>
              {sidebarOpen && savedRecords.length > 0 && (
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
                  {savedRecords.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Bottom: Settings, Theme & Preferences */}
        <div className="p-2 border-t border-[#ececeb] dark:border-[#2e2e2e] space-y-1">
          {/* SUS Filter Switch */}
          <button
            type="button"
            onClick={toggleSusFilter}
            className={`w-full flex items-center ${
              sidebarOpen ? 'justify-between px-2.5 py-1.5' : 'justify-center p-2'
            } rounded-md text-xs transition-colors ${
              susFilter
                ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30'
                : 'text-slate-500 dark:text-neutral-400 hover:bg-[#efefee] dark:hover:bg-[#262626]'
            }`}
            title="Priorizar RENAME / SUS"
          >
            <div className="flex items-center gap-2 truncate">
              <Pill className="w-3.5 h-3.5 shrink-0" />
              {sidebarOpen && <span className="truncate">Filtro SUS</span>}
            </div>
            {sidebarOpen && (
              <span className="text-[10px] font-bold uppercase">{susFilter ? 'ON' : 'OFF'}</span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`w-full flex items-center ${
              sidebarOpen ? 'justify-between px-2.5 py-1.5' : 'justify-center p-2'
            } rounded-md text-xs text-slate-600 dark:text-neutral-400 hover:bg-[#efefee] dark:hover:bg-[#262626] hover:text-slate-900 dark:hover:text-white transition-colors`}
            title={isDark ? "Modo claro" : "Modo escuro"}
          >
            <div className="flex items-center gap-2 truncate">
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Moon className="w-3.5 h-3.5 shrink-0" />}
              {sidebarOpen && <span className="truncate">Aparência</span>}
            </div>
            {sidebarOpen && (
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                {isDark ? 'Escuro' : 'Claro'}
              </span>
            )}
          </button>

          {/* Cloud Sync Modal */}
          <button
            type="button"
            onClick={() => setCloudSyncOpen(true)}
            className={`w-full flex items-center ${
              sidebarOpen ? 'justify-between px-2.5 py-1.5' : 'justify-center p-2'
            } rounded-md text-xs text-slate-600 dark:text-neutral-400 hover:bg-[#efefee] dark:hover:bg-[#262626] hover:text-slate-900 dark:hover:text-white transition-colors`}
            title={currentDoctor ? `Médico: ${currentDoctor.email?.replace('@prontuario.med.br', '')}` : "Nuvem Firebase (Entrar / Cadastrar)"}
          >
            <div className="flex items-center gap-2 truncate">
              <Cloud className={`w-3.5 h-3.5 shrink-0 ${currentDoctor ? 'text-emerald-500' : 'text-slate-400 dark:text-neutral-500'}`} />
              {sidebarOpen && (
                <span className="truncate">
                  {currentDoctor ? currentDoctor.email?.replace('@prontuario.med.br', '') : 'Nuvem / Login'}
                </span>
              )}
            </div>
            {sidebarOpen && (
              <span className={`text-[10px] font-semibold uppercase ${currentDoctor ? 'text-emerald-500' : 'text-slate-400'}`}>
                {currentDoctor ? 'Online' : 'Entrar'}
              </span>
            )}
          </button>

          {/* Settings Modal */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={`w-full flex items-center ${
              sidebarOpen ? 'justify-between px-2.5 py-1.5' : 'justify-center p-2'
            } rounded-md text-xs text-slate-600 dark:text-neutral-400 hover:bg-[#efefee] dark:hover:bg-[#262626] hover:text-slate-900 dark:hover:text-white transition-colors`}
            title="Configurações (API Key, Modelos)"
          >
            <div className="flex items-center gap-2 truncate">
              <Settings className="w-3.5 h-3.5 shrink-0" />
              {sidebarOpen && <span className="truncate">Configurações</span>}
            </div>
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA                                             */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Clean Notion Topbar */}
        <header className="sticky top-0 z-20 bg-[#fafafa]/90 dark:bg-[#191919]/90 backdrop-blur-md border-b border-[#ececeb] dark:border-[#2e2e2e] px-4 md:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile / collapsed toggle button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white hover:bg-[#efefee] dark:hover:bg-[#262626] transition-colors md:hidden"
              title="Menu"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {/* Breadcrumb / Title */}
            <div className="flex items-center gap-2 text-xs truncate">
              <span className="text-slate-400 dark:text-neutral-500 font-normal">
                {activeTab === 'atendimento' && 'Atendimento'}
                {activeTab === 'documentos' && 'Documentos'}
                {activeTab === 'evolucao' && 'Evolução'}
                {activeTab === 'observacao' && 'Observação'}
                {activeTab === 'historico' && 'Histórico'}
              </span>
              <span className="text-slate-300 dark:text-neutral-600">/</span>
              <span className="font-semibold text-slate-800 dark:text-neutral-200 truncate">
                {patient.nome ? patient.nome : 'Paciente Não Identificado'}
              </span>
            </div>
          </div>

          {/* Right Status Actions */}
          <div className="flex items-center gap-2">
            {/* Botão estético para ocultar / mostrar I.A. */}
            {(activeTab === 'atendimento' || activeTab === 'evolucao') && (
              <button
                type="button"
                onClick={toggleHideAiBoxes}
                className={`h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-2xs ${
                  hideAiBoxes
                    ? 'bg-slate-100 dark:bg-[#202020] text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-[#383838] hover:text-slate-800 dark:hover:text-white'
                    : 'bg-white dark:bg-[#252525] text-slate-700 dark:text-neutral-200 border-slate-200 dark:border-[#383838] hover:bg-slate-50 dark:hover:bg-[#2a2a2a]'
                }`}
                title={hideAiBoxes ? 'Mostrar boxes de Inteligência Artificial' : 'Ocultar boxes de Inteligência Artificial'}
              >
                <Sparkles className={`w-3.5 h-3.5 ${hideAiBoxes ? 'text-slate-400 dark:text-neutral-500' : 'text-amber-500 dark:text-amber-400'}`} />
                <span className="hidden sm:inline">
                  {hideAiBoxes ? 'Mostrar IA' : 'Ocultar IA'}
                </span>
              </button>
            )}

            {/* Salvar atendimento (Apenas ícone de disquete) */}
            <button
              type="button"
              onClick={handleManualSave}
              className="p-2 rounded-lg border border-[#ececeb] dark:border-[#333] bg-white dark:bg-[#252525] hover:bg-[#efefee] dark:hover:bg-[#2a2a2a] flex items-center justify-center transition-colors text-slate-600 dark:text-neutral-300 shadow-xs"
              title={autoSaveStatus === 'salvando' ? 'Salvando atendimento...' : 'Salvar atendimento'}
            >
              <Save className={`w-4 h-4 ${autoSaveStatus === 'salvando' ? 'text-amber-400 animate-spin' : 'text-slate-500 dark:text-neutral-300'}`} />
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'atendimento' && (
          <AtendimentoView
            patient={patient}
            setPatient={setPatient}
            qp={qp}
            setQp={setQp}
            hma={hma}
            setHma={setHma}
            hpp={hpp}
            setHpp={setHpp}
            vitals={vitals}
            setVitals={setVitals}
            exameFisico={exameFisico}
            setExameFisico={setExameFisico}
            condutas={condutas}
            setCondutas={setCondutas}
            aiResults={aiResults}
            setAiResults={setAiResults}
            aiLoading={aiLoading}
            prompts={prompts}
            templates={templates}
            susFilter={susFilter}
            observation={observation}
            setObservation={setObservation}
            getCasePayload={getCasePayload}
            getPayloadTemplate={getPayloadTemplate}
            handleSavePrompt={handleSavePrompt}
            handleSaveGlobalPrompt={handleSaveGlobalPrompt}
            handleResetSinglePrompt={handleResetSinglePrompt}
            handleSaveTemplate={handleSaveTemplate}
            handleSaveGlobalTemplate={handleSaveGlobalTemplate}
            handleResetSinglePayloadTemplate={handleResetSinglePayloadTemplate}
            runAiHma={runAiHma}
            runAiExameFisico={runAiExameFisico}
            runAiDiagnostico={runAiDiagnostico}
            runAiConduta={runAiConduta}
            runAiMelhorarCondutas={runAiMelhorarCondutas}
            runAiOrientacoes={runAiOrientacoes}
            showToast={showToast}
            hideAiBoxes={hideAiBoxes}
          />
        )}

        {activeTab === 'documentos' && (
          <DocumentosView
            documents={documents}
            setDocuments={setDocuments}
            compileAllDocuments={compileAllDocuments}
            compileSingleDocument={compileSingleDocument}
            templates={templates}
            prompts={prompts}
            handleSaveTemplate={handleSaveTemplate}
            handleSaveGlobalTemplate={handleSaveGlobalTemplate}
            handleSavePrompt={handleSavePrompt}
            handleSaveGlobalPrompt={handleSaveGlobalPrompt}
            handleResetSinglePrompt={handleResetSinglePrompt}
            getCasePayload={getCasePayload}
            getPayloadTemplate={getPayloadTemplate}
            handleResetSinglePayloadTemplate={handleResetSinglePayloadTemplate}
            runAiPassagemPlantao={runAiPassagemPlantao}
            runAiPassometro={runAiPassometro}
            aiLoading={aiLoading}
          />
        )}

        {activeTab === 'evolucao' && (
          <EvolucaoView
            patientName={patient.nome}
            observation={observation}
            setObservation={setObservation}
            examResults={examResults}
            setExamResults={setExamResults}
            aiResults={aiResults}
            aiLoading={aiLoading}
            prompts={prompts}
            templates={templates}
            getCasePayload={getCasePayload}
            getPayloadTemplate={getPayloadTemplate}
            handleSavePrompt={handleSavePrompt}
            handleSaveGlobalPrompt={handleSaveGlobalPrompt}
            handleResetSinglePrompt={handleResetSinglePrompt}
            handleSaveTemplate={handleSaveTemplate}
            handleSaveGlobalTemplate={handleSaveGlobalTemplate}
            handleResetSinglePayloadTemplate={handleResetSinglePayloadTemplate}
            runAiReavaliacao={runAiReavaliacao}
            runAiConclusaoObs={runAiConclusaoObs}
            evolucaoDocument={documents.evolucao}
            setEvolucaoDocument={(val) => setDocuments((prev) => ({ ...prev, evolucao: val }))}
            generateEvolucaoDocument={generateEvolucaoDocument}
            toggleObservation={toggleObservation}
            hideAiBoxes={hideAiBoxes}
          />
        )}

        {activeTab === 'observacao' && (
          <FilaObservacaoView
            activeObsPatients={sortedActiveObsPatients}
            currentRecordId={currentRecordId}
            onSelectPatient={(rec) => {
              if (rec.id !== currentRecordId) {
                handleLoadRecord(rec);
              }
              setActiveTab('evolucao');
            }}
            onDischargePatient={handleDischargeFromObservation}
            onRestorePatient={handleRestoreDischargedPatient}
            canRestore={!!lastDischargedRecordId}
            computeCountdown={computeObservationCountdown}
          />
        )}

        {activeTab === 'historico' && (
          <HistoricoView
            records={savedRecords}
            currentRecordId={currentRecordId}
            onLoadRecord={(rec) => {
              handleLoadRecord(rec);
              setActiveTab('atendimento');
            }}
            onDeleteRecord={handleDeleteRecord}
            onRestoreRecord={handleRestoreDeletedRecord}
            canRestore={!!lastDeletedRecord}
            onOpenCloudSync={() => setCloudSyncOpen(true)}
          />
        )}
      </main>
      </div>

      {/* Cloud Sync Modal (Firebase com Criptografia Ponta a Ponta) */}
      <CloudSyncModal
        isOpen={cloudSyncOpen}
        onClose={() => setCloudSyncOpen(false)}
        encryptionKey={masterKey}
        onSaveEncryptionKey={handleSaveMasterKey}
        onSyncToCloud={handleSyncToCloud}
        onPullFromCloud={handlePullFromCloud}
        localRecordsCount={savedRecords.length}
        onExportLocalBackup={handleExportLocalBackup}
        onImportLocalBackup={handleImportLocalBackup}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        model={model}
        onSaveModel={handleSaveModel}
        configSource={configSource}
        onSelectConfigSource={handleSelectConfigSource}
        onResetTemplates={handleResetTemplates}
        onExportDefaultsFile={handleExportDefaultsFile}
        onCopyDefaultsCode={handleCopyDefaultsCode}
        onSaveAllAsGlobalDefault={handleSaveAllAsGlobalDefault}
        onPullGlobalDefaults={handlePullGlobalDefaults}
      />
    </div>
  );
}
