import React, { useMemo } from 'react';
import {
  ShieldAlert,
  Home,
  Bed,
  Building2,
  Ambulance,
  Check,
  Calculator,
  X,
  Pill,
  Clock,
  Copy,
  FileText,
} from 'lucide-react';
import type {
  PatientData,
  VitalSigns,
  HppData,
  AIResult,
  ObservationData,
  SystemTemplates,
  SystemPrompts,
  FinalDocuments,
} from '../types';
import { UndoableTextarea } from '../components/UndoableTextarea';
import { AIActionButton } from '../components/AIActionButton';
import { TemplateEditorButton } from '../components/TemplateEditorButton';
import { AIDrawer } from '../components/AIDrawer';
import { MedicationSearchDropdown } from '../components/MedicationSearchDropdown';
import { appendMedicationToPrescription } from '../services/receituarioService';
import { parseHppText } from '../data/defaults';
import { DEFAULT_GERAR_CONDUTAS_PROMPT } from '../hooks/useAiWorkflow';
import { buildDocument, type CompilableDocType } from '../utils/documentCompiler';
import type { TagContextData } from '../utils/templateTags';

function parseIdadeParts(idadeStr?: string, anosProp?: string, mesesProp?: string): { anos: string; meses: string } {
  if (anosProp !== undefined && mesesProp !== undefined) {
    return { anos: anosProp, meses: mesesProp };
  }
  const str = (idadeStr ?? '').trim();
  if (!str) return { anos: anosProp ?? '', meses: mesesProp ?? '' };

  const anosMatch = str.match(/(\d+)\s*(?:ano|a\b)/i);
  const mesesMatch = str.match(/(\d+)\s*(?:m[êe]s|meses|m\b)/i);

  if (anosMatch || mesesMatch) {
    return {
      anos: anosProp !== undefined ? anosProp : (anosMatch ? anosMatch[1] : (str.includes('ano') ? '0' : '')),
      meses: mesesProp !== undefined ? mesesProp : (mesesMatch ? mesesMatch[1] : '')
    };
  }

  if (/^\d+$/.test(str)) {
    return { anos: anosProp ?? str, meses: mesesProp ?? '' };
  }

  return { anos: anosProp ?? str, meses: mesesProp ?? '' };
}

function formatIdadeParts(anos: string, meses: string): string {
  const a = anos.trim();
  const m = meses.trim();

  if (a !== '' && m !== '') {
    const numA = Number(a);
    const numM = Number(m);
    const labelA = numA === 1 ? 'ano' : 'anos';
    const labelM = numM === 1 ? 'mês' : 'meses';
    return `${a} ${labelA} e ${m} ${labelM}`;
  }
  if (a !== '') {
    const numA = Number(a);
    const labelA = numA === 1 ? 'ano' : 'anos';
    return `${a} ${labelA}`;
  }
  if (m !== '') {
    const numM = Number(m);
    const labelM = numM === 1 ? 'mês' : 'meses';
    return `${m} ${labelM}`;
  }
  return '';
}

interface AtendimentoViewProps {
  patient: PatientData;
  setPatient: React.Dispatch<React.SetStateAction<PatientData>>;
  qp: string;
  setQp: (val: string) => void;
  hma: string;
  setHma: (val: string) => void;
  hpp: HppData;
  setHpp: React.Dispatch<React.SetStateAction<HppData>>;
  vitals: VitalSigns;
  setVitals: React.Dispatch<React.SetStateAction<VitalSigns>>;
  exameFisico: string;
  setExameFisico: (val: string) => void;
  condutas: string;
  setCondutas: (val: string) => void;
  aiResults: AIResult;
  setAiResults: React.Dispatch<React.SetStateAction<AIResult>>;
  aiLoading: Record<string, boolean>;
  prompts: SystemPrompts;
  templates: SystemTemplates;
  susFilter: boolean;
  observation: ObservationData;
  setObservation: React.Dispatch<React.SetStateAction<ObservationData>>;
  getCasePayload: (key: keyof SystemTemplates) => string;
  getPayloadTemplate: (key: keyof SystemTemplates) => string;
  handleSavePrompt: (key: keyof SystemPrompts, value: string) => void;
  handleSaveGlobalPrompt?: (key: keyof SystemPrompts, value: string) => void;
  handleResetSinglePrompt: (key: keyof SystemPrompts) => void;
  handleSaveTemplate: (key: keyof SystemTemplates, value: string) => void;
  handleSaveGlobalTemplate?: (key: keyof SystemTemplates, value: string) => void;
  handleResetSinglePayloadTemplate: (key: keyof SystemTemplates) => void;
  runAiHma: () => void;
  runAiExameFisico: () => void;
  runAiDiagnostico: () => void;
  runAiConduta: () => void;
  runAiGerarCondutas?: () => void;
  runAiMelhorarCondutas?: () => void;
  runAiOrientacoes?: () => void;
  runAiEncaminhamento?: (customInstruction?: string) => void;
  documents?: FinalDocuments;
  setDocuments?: React.Dispatch<React.SetStateAction<FinalDocuments>>;
  compileSingleDocument?: (
    docType: CompilableDocType,
    customReplacements?: Record<string, string>
  ) => void;
  tagContextData?: TagContextData;
  showToast: (msg: string) => void;
  hideAiBoxes?: boolean;
}

export const AtendimentoView: React.FC<AtendimentoViewProps> = ({
  patient,
  setPatient,
  qp,
  setQp,
  hma,
  setHma,
  hpp,
  setHpp,
  vitals,
  setVitals,
  exameFisico,
  setExameFisico,
  condutas,
  setCondutas,
  aiResults,
  setAiResults,
  aiLoading,
  prompts,
  templates,
  susFilter,
  observation,
  setObservation,
  getCasePayload,
  getPayloadTemplate,
  handleSavePrompt,
  handleSaveGlobalPrompt,
  handleResetSinglePrompt,
  handleSaveTemplate,
  handleSaveGlobalTemplate,
  handleResetSinglePayloadTemplate,
  runAiHma,
  runAiExameFisico,
  runAiDiagnostico,
  runAiConduta,
  runAiGerarCondutas,
  runAiEncaminhamento,
  documents,
  setDocuments,
  compileSingleDocument,
  tagContextData,
  showToast,
  hideAiBoxes = false,
}) => {
  // Handler for selecting clinical outcome (Desfecho)
  const handleSelectOutcome = (dest: 'alta' | 'observacao' | 'internacao' | 'transferencia') => {
    setAiResults((prev) => ({ ...prev, clinicalOutcome: dest }));

    if (dest === 'observacao') {
      if (!observation.inObservation) {
        setObservation((prev) => ({
          ...prev,
          inObservation: true,
          startedAt: prev.startedAt || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        }));
      }
    } else {
      if (observation.inObservation) {
        setObservation((prev) => ({ ...prev, inObservation: false }));
      }
    }
  };

  // Cálculo automático de IMC
  const computedImc = React.useMemo(() => {
    const p = parseFloat(patient.peso.replace(',', '.'));
    const a = parseFloat(patient.altura.replace(',', '.'));
    if (!p || !a || a <= 0) return '';
    const alturaMetros = a > 3 ? a / 100 : a;
    const imc = p / (alturaMetros * alturaMetros);
    if (isNaN(imc) || !isFinite(imc) || imc <= 0) return '';
    return imc.toFixed(1);
  }, [patient.peso, patient.altura]);

  // Calculadora de carga tabágica (anos-maço)
  const [showSmokingCalc, setShowSmokingCalc] = React.useState(false);
  const [smokingCigs, setSmokingCigs] = React.useState('');
  const [smokingYears, setSmokingYears] = React.useState('');

  const smokingPreview = React.useMemo(() => {
    const cigs = parseFloat(smokingCigs.replace(',', '.'));
    const years = parseFloat(smokingYears.replace(',', '.'));
    if (isNaN(cigs) || cigs <= 0 || isNaN(years) || years <= 0) {
      return '';
    }
    const packYears = (cigs / 20) * years;
    const packYearsFormatted = Number.isInteger(packYears)
      ? packYears.toString()
      : parseFloat(packYears.toFixed(2)).toString().replace('.', ',');

    const cigsStr = cigs === 1 ? '1 cigarro por dia' : `${cigs} cigarros por dia`;
    const yearsStr = years === 1 ? 'há 1 ano' : `há ${years} anos`;
    const macoStr = packYearsFormatted === '1' ? '1 ano-maço' : `${packYearsFormatted} anos-maço`;

    return `${cigsStr}, ${yearsStr}, ${macoStr}.`;
  }, [smokingCigs, smokingYears]);

  const handleApplySmoking = () => {
    if (!smokingPreview) return;
    setHpp((prev) => ({ ...prev, tabagismo: smokingPreview }));
    setShowSmokingCalc(false);
    showToast('Carga tabágica inserida com sucesso!');
  };

  // Ranking de Hipóteses estático e FIXO (gerado pela IA)
  const displayedHypotheses = useMemo(() => {
    return aiResults.hypothesisRankings || [];
  }, [aiResults.hypothesisRankings]);

  // Controle de seleção nos rankings baseado no valor atualmente definido
  const selectedHypothesisIdx = React.useMemo(() => {
    if (!aiResults.mainHypothesis || !aiResults.hypothesisRankings || aiResults.hypothesisRankings.length === 0) {
      return null;
    }
    const idx = aiResults.hypothesisRankings.findIndex((h) => h.nome.trim().toLowerCase() === aiResults.mainHypothesis?.trim().toLowerCase());
    return idx >= 0 ? idx : null;
  }, [aiResults.mainHypothesis, aiResults.hypothesisRankings]);

  const selectedCidIdx = React.useMemo(() => {
    if (!aiResults.selectedCid || !aiResults.cidRankings || aiResults.cidRankings.length === 0) {
      return null;
    }
    const currentVal = aiResults.selectedCid.trim().toLowerCase();
    const idx = aiResults.cidRankings.findIndex((c) => {
      const full = `${c.cid} - ${c.desc}`.toLowerCase();
      return full === currentVal || c.cid.toLowerCase() === currentVal;
    });
    return idx >= 0 ? idx : null;
  }, [aiResults.selectedCid, aiResults.cidRankings]);

  // Estilo das badges de probabilidade
  const getProbBadgeClass = (prob: string = '') => {
    const p = prob.toLowerCase();
    if (p.includes('alta')) {
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20';
    }
    if (p.includes('méd') || p.includes('med')) {
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20';
    }
    return 'bg-slate-200 dark:bg-navy-800 text-slate-600 dark:text-slate-400 border border-slate-300/40 dark:border-slate-700/50';
  };

  const [prevHma, setPrevHma] = React.useState<string | null>(null);
  const [prevExameFisico, setPrevExameFisico] = React.useState<string | null>(null);
  const [prevCondutas, setPrevCondutas] = React.useState<string | null>(null);

  const handleImplementHma = () => {
    setPrevHma(hma);
    setHma(aiResults.hmaSuggestion || '');
  };

  const handleUndoHma = () => {
    if (prevHma !== null) {
      const current = hma;
      setHma(prevHma);
      setPrevHma(current);
    }
  };

  const handleImplementExameFisico = () => {
    setPrevExameFisico(exameFisico);
    setExameFisico(aiResults.physicalExamSuggestion || '');
  };

  const handleUndoExameFisico = () => {
    if (prevExameFisico !== null) {
      const current = exameFisico;
      setExameFisico(prevExameFisico);
      setPrevExameFisico(current);
    }
  };

  const handleImplementCondutas = () => {
    setPrevCondutas(condutas);
    setCondutas(aiResults.condutasSuggestion || '');
  };

  const handleUndoCondutas = () => {
    if (prevCondutas !== null) {
      const current = condutas;
      setCondutas(prevCondutas);
      setPrevCondutas(current);
    }
  };

  const [activeDocDrawer, setActiveDocDrawer] = React.useState<'atestado' | 'relatorio' | null>(null);
  const [diasAtestado, setDiasAtestado] = React.useState<string>(() => {
    const raw = aiResults?.medicalLeaveDays || '';
    const m = String(raw).match(/\d+/);
    let n = m ? parseInt(m[0], 10) : 1;
    if (n === 3 || isNaN(n) || n <= 0) n = 1;
    return n <= 9 ? `0${n}` : String(n);
  });
  const [incluirCid, setIncluirCid] = React.useState<boolean>(true);
  const [relatorioCustomInstruction, setRelatorioCustomInstruction] = React.useState<string>('');
  const [copiedDoc, setCopiedDoc] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (aiResults?.medicalLeaveDays) {
      const m = String(aiResults.medicalLeaveDays).match(/\d+/);
      if (m) {
        let n = parseInt(m[0], 10);
        if (n === 3 || isNaN(n) || n <= 0) n = 1;
        setDiasAtestado(n <= 9 ? `0${n}` : String(n));
      }
    }
  }, [aiResults?.medicalLeaveDays]);

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedDoc(id);
    setTimeout(() => setCopiedDoc(null), 1800);
  };

  const handleCompileAtestado = () => {
    if (compileSingleDocument) {
      const n = parseInt(diasAtestado, 10) || 1;
      const formatted = n <= 9 ? `0${n}` : String(n);
      compileSingleDocument('atestado', {
        DIAS: formatted,
        INCLUIR_CID: incluirCid ? 'true' : 'false'
      });
    }
  };

  const handleCompileRelatorio = () => {
    if (compileSingleDocument) {
      compileSingleDocument('encaminhamento');
    }
  };

  const handleRunAiRelatorio = () => {
    if (runAiEncaminhamento) {
      runAiEncaminhamento(relatorioCustomInstruction);
    }
  };

  const handleCopyProntuario = () => {
    const text = tagContextData
      ? buildDocument('prontuario', templates, tagContextData)
      : (documents?.prontuario || '');
    if (setDocuments && text) {
      setDocuments((prev) => ({ ...prev, prontuario: text }));
    }
    copyToClipboard(text, 'prontuario');
  };

  const handleCopyReceita = () => {
    const text = tagContextData
      ? buildDocument('receitaDomiciliar', templates, tagContextData)
      : (documents?.receitaDomiciliar || '');
    if (setDocuments && text) {
      setDocuments((prev) => ({ ...prev, receitaDomiciliar: text }));
    }
    copyToClipboard(text, 'receita');
  };

  const handleCopyAtestado = () => {
    let text = documents?.atestado;
    if (!text && tagContextData) {
      const n = parseInt(diasAtestado, 10) || 1;
      const formatted = n <= 9 ? `0${n}` : String(n);
      text = buildDocument('atestado', templates, {
        ...tagContextData,
        customReplacements: {
          ...tagContextData.customReplacements,
          DIAS: formatted,
          INCLUIR_CID: incluirCid ? 'true' : 'false'
        }
      });
      if (setDocuments && text) setDocuments((prev) => ({ ...prev, atestado: text }));
    }
    copyToClipboard(text || '', 'atestado');
  };

  const handleCopyRelatorio = () => {
    let text = documents?.encaminhamento;
    if (!text && tagContextData) {
      text = buildDocument('encaminhamento', templates, tagContextData);
      if (setDocuments && text) setDocuments((prev) => ({ ...prev, encaminhamento: text }));
    }
    copyToClipboard(text || '', 'relatorio');
  };

  const idadeParts = useMemo(() => {
    return parseIdadeParts(patient.idade, patient.idadeAnos, patient.idadeMeses);
  }, [patient.idade, patient.idadeAnos, patient.idadeMeses]);

  const handleIdadeChange = (newAnos: string, newMeses: string) => {
    const formatted = formatIdadeParts(newAnos, newMeses);
    setPatient((prev) => ({
      ...prev,
      idadeAnos: newAnos,
      idadeMeses: newMeses,
      idade: formatted
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* IDENTIFICAÇÃO DO PACIENTE */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            IDENTIFICAÇÃO
          </h2>
          {patient.horaInicio && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Início:</span>
              <input
                type="text"
                value={patient.horaInicio}
                onChange={(e) => {
                  const val = e.target.value;
                  setPatient((prev) => ({
                    ...prev,
                    horaInicio: val,
                    dataHoraInicio: prev.dataHoraInicio ? `${prev.dataHoraInicio.split(' - ')[0]} - ${val}` : val
                  }));
                }}
                className="w-14 px-1 py-0.5 text-xs font-mono font-medium rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-300 dark:focus:border-slate-600 bg-transparent text-slate-700 dark:text-neutral-300 focus:outline-none text-center"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 text-sm">
          {/* Nome */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Nome
            </label>
            <input
              type="text"
              value={patient.nome}
              onChange={(e) => {
                const newName = e.target.value;
                setPatient((prev) => {
                  let horaInicio = prev.horaInicio;
                  let dataHoraInicio = prev.dataHoraInicio;
                  if (newName.trim().length > 0 && !horaInicio) {
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const dateStr = now.toLocaleDateString('pt-BR');
                    horaInicio = timeStr;
                    dataHoraInicio = `${dateStr} - ${timeStr}`;
                  }
                  return {
                    ...prev,
                    nome: newName,
                    horaInicio,
                    dataHoraInicio
                  };
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>

          {/* Idade - Anos */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1 text-center">
              Anos
            </label>
            <input
              type="text"
              value={idadeParts.anos}
              onChange={(e) => handleIdadeChange(e.target.value, idadeParts.meses)}
              className="w-full px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50 text-center"
            />
          </div>

          {/* Idade - Meses */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1 text-center">
              Meses
            </label>
            <input
              type="text"
              value={idadeParts.meses}
              onChange={(e) => handleIdadeChange(idadeParts.anos, e.target.value)}
              className="w-full px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50 text-center"
            />
          </div>

          {/* Sexo com Masculino e Feminino completos */}
          <div className="lg:col-span-3">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Sexo
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setPatient({ ...patient, sexo: 'M' })}
                className={`h-[38px] px-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1 ${
                  patient.sexo === 'M'
                    ? 'bg-slate-900 text-white dark:bg-[#303030] dark:text-white border-slate-900 dark:border-[#484848] font-semibold shadow-2xs'
                    : 'bg-white dark:bg-[#202020] border-[#e5e5e5] dark:border-[#333] text-slate-600 dark:text-neutral-400 hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                }`}
              >
                <span>Masculino</span>
              </button>

              <button
                type="button"
                onClick={() => setPatient({ ...patient, sexo: 'F' })}
                className={`h-[38px] px-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1 ${
                  patient.sexo === 'F'
                    ? 'bg-slate-900 text-white dark:bg-[#303030] dark:text-white border-slate-900 dark:border-[#484848] font-semibold shadow-2xs'
                    : 'bg-white dark:bg-[#202020] border-[#e5e5e5] dark:border-[#333] text-slate-600 dark:text-neutral-400 hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                }`}
              >
                <span>Feminino</span>
              </button>
            </div>
          </div>

          {/* Peso */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1 text-center">
              Peso (kg)
            </label>
            <input
              type="text"
              value={patient.peso}
              onChange={(e) => setPatient({ ...patient, peso: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50 text-center"
            />
          </div>

          {/* Altura */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1 text-center">
              Altura (cm)
            </label>
            <input
              type="text"
              value={patient.altura}
              onChange={(e) => setPatient({ ...patient, altura: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50 text-center"
            />
          </div>

          {/* IMC Calculado Automaticamente */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1 text-center">
              IMC
            </label>
            <input
              type="text"
              readOnly
              value={computedImc ? `${computedImc}` : ''}
              className="w-full px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-[#1f1f1f] text-slate-800 dark:text-ice-100 text-sm font-semibold text-center cursor-default"
            />
          </div>
        </div>
      </section>

      {/* QUEIXA PRINCIPAL E HISTÓRIA DA MOLÉSTIA ATUAL */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            QUEIXA PRINCIPAL E HISTÓRIA DA MOLÉSTIA ATUAL
          </h2>
          <AIActionButton
            label="Aprimorar HMA com IA"
            onExecute={runAiHma}
            isLoading={!!aiLoading.hma}
            promptKey="hma"
            currentPrompt={prompts.hma}
            onSavePrompt={(p) => handleSavePrompt('hma', p)}
            onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('hma', p) : undefined}
            onResetPrompt={() => handleResetSinglePrompt('hma')}
            contextPayload={getCasePayload('payloadHma')}
            payloadTemplate={getPayloadTemplate('payloadHma')}
            onSavePayloadTemplate={(t) => handleSaveTemplate('payloadHma', t)}
            onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadHma', t) : undefined}
            onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadHma')}
          />
        </div>

        {/* QP */}
        <div>
          <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
            Queixa Principal (QP)
          </label>
          <input
            type="text"
            value={qp}
            onChange={(e) => setQp(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50 font-medium"
          />
        </div>

        {/* HMA */}
        <div>
          <UndoableTextarea
            label="História da Moléstia Atual (HMA)"
            labelClassName="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1"
            value={hma}
            onChange={setHma}
            rows={4}
            hideActions={true}
          />

          {/* Sugestão de Texto da IA com botão de engavetar e implementar */}
          {!hideAiBoxes && aiResults.hmaSuggestion && (
            <AIDrawer
              title="Sugestão da IA para HMA:"
              onImplement={handleImplementHma}
              onUndo={handleUndoHma}
              canUndo={prevHma !== null}
              triggerUpdate={aiResults.hmaSuggestion}
            >
              <p className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-[#1a1a1a] p-2.5 rounded border border-[#e5e5e5] dark:border-[#2e2e2e]">
                {aiResults.hmaSuggestion}
              </p>
            </AIDrawer>
          )}
        </div>

        {/* Box de Omissões Sugeridas pela IA com botão de engavetar */}
        {!hideAiBoxes && aiResults.hmaMissingQuestions && aiResults.hmaMissingQuestions.length > 0 && (
          <AIDrawer
            title="O que faltou investigar neste caso (IA):"
            variant="blue"
            triggerUpdate={aiResults.hmaMissingQuestions}
          >
            <ul className="list-disc list-inside text-blue-800 dark:text-ice-300 space-y-0.5 pl-1 text-xs">
              {aiResults.hmaMissingQuestions.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          </AIDrawer>
        )}
      </section>

      {/* HISTÓRIA PATOLÓGICA PREGRESSA */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            HISTÓRIA PATOLÓGICA PREGRESSA
          </h2>
          <TemplateEditorButton
            label="HPP"
            templateKey="hpp"
            currentTemplate={templates.hpp}
            onSaveTemplate={(t) => {
              handleSaveTemplate('hpp', t);
              setHpp(parseHppText(t));
            }}
            onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => {
              handleSaveGlobalTemplate('hpp', t);
              setHpp(parseHppText(t));
            } : undefined}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Alergias
            </label>
            <input
              type="text"
              value={hpp.alergias}
              onChange={(e) => setHpp({ ...hpp, alergias: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                hpp.alergias.trim() !== '' &&
                !/^(nega(\.|\s|$)|não\s+refere|sem\s+alergia|nega\s+alergia)/i.test(hpp.alergias.trim())
                  ? 'border-rose-400 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 font-semibold focus:ring-rose-500/30'
                  : 'border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#202020] text-slate-800 dark:text-neutral-200 focus:ring-neutral-400/30'
              }`}
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Comorbidades
            </label>
            <input
              type="text"
              value={hpp.comorbidades}
              onChange={(e) => setHpp({ ...hpp, comorbidades: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Medicações de Uso Contínuo (MUC)
            </label>
            <input
              type="text"
              value={hpp.muc}
              onChange={(e) => setHpp({ ...hpp, muc: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Cirurgias Prévias
            </label>
            <input
              type="text"
              value={hpp.cirurgias}
              onChange={(e) => setHpp({ ...hpp, cirurgias: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>

          <div className="relative">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Tabagismo
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={hpp.tabagismo}
                onChange={(e) => setHpp({ ...hpp, tabagismo: e.target.value })}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
              />
              <button
                type="button"
                onClick={() => setShowSmokingCalc((prev) => !prev)}
                className={`h-[38px] w-[38px] shrink-0 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                  showSmokingCalc
                    ? 'bg-slate-200 dark:bg-navy-700 border-slate-400 dark:border-slate-600 text-slate-800 dark:text-ice-100'
                    : 'bg-white dark:bg-navy-900 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-ice-100 hover:bg-slate-50 dark:hover:bg-navy-800'
                }`}
                title="Calcular carga tabágica (anos-maço)"
              >
                <Calculator className="w-4 h-4" />
              </button>
            </div>

            {showSmokingCalc && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowSmokingCalc(false)}
                />
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-30 w-72 p-3 bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      Calculadora de Carga Tabágica
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSmokingCalc(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                      title="Fechar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Cigarros/dia
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={smokingCigs}
                        onChange={(e) => setSmokingCigs(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && smokingPreview) {
                            handleApplySmoking();
                          }
                          if (e.key === 'Escape') {
                            setShowSmokingCalc(false);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-950 text-slate-800 dark:text-ice-100 text-xs focus:outline-none focus:ring-1 focus:ring-ice-400"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Tempo (anos)
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={smokingYears}
                        onChange={(e) => setSmokingYears(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && smokingPreview) {
                            handleApplySmoking();
                          }
                          if (e.key === 'Escape') {
                            setShowSmokingCalc(false);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-950 text-slate-800 dark:text-ice-100 text-xs focus:outline-none focus:ring-1 focus:ring-ice-400"
                      />
                    </div>
                  </div>

                  {smokingPreview ? (
                    <div className="p-2 bg-slate-50 dark:bg-navy-950/70 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words font-medium">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Resultado:</div>
                      {smokingPreview}
                    </div>
                  ) : (
                    <div className="p-2 text-[11px] text-slate-400 italic text-center">
                      Insira os cigarros/dia e anos para calcular.
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowSmokingCalc(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!smokingPreview}
                      onClick={handleApplySmoking}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-900 dark:bg-ice-500 dark:hover:bg-ice-600 text-white text-xs font-medium rounded-md shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Inserir no campo
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Etilismo
            </label>
            <input
              type="text"
              value={hpp.etilismo}
              onChange={(e) => setHpp({ ...hpp, etilismo: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>
        </div>
      </section>

      {/* EXAME FÍSICO */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            EXAME FÍSICO
          </h2>
          <div className="flex items-center gap-2">
            <TemplateEditorButton
              label="Exame Físico"
              templateKey="exameFisico"
              currentTemplate={templates.exameFisico}
              onSaveTemplate={(t) => {
                handleSaveTemplate('exameFisico', t);
                setExameFisico(t);
              }}
              onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => {
                handleSaveGlobalTemplate('exameFisico', t);
                setExameFisico(t);
                showToast('Template de Exame Físico definido como padrão global!');
              } : undefined}
            />
            <AIActionButton
              label="Refinar Exame Físico com IA"
              onExecute={runAiExameFisico}
              isLoading={!!aiLoading.exame}
              promptKey="exameFisico"
              currentPrompt={prompts.exameFisico}
              onSavePrompt={(p) => handleSavePrompt('exameFisico', p)}
              onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('exameFisico', p) : undefined}
              onResetPrompt={() => handleResetSinglePrompt('exameFisico')}
              contextPayload={getCasePayload('payloadExameFisico')}
              payloadTemplate={getPayloadTemplate('payloadExameFisico')}
              onSavePayloadTemplate={(t) => handleSaveTemplate('payloadExameFisico', t)}
              onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadExameFisico', t) : undefined}
              onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadExameFisico')}
            />
          </div>
        </div>

        {/* Sinais Vitais */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 dark:bg-navy-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-xs font-semibold mb-1">PA (mmHg)</label>
            <input
              type="text"
              value={vitals.pa}
              onChange={(e) => setVitals({ ...vitals, pa: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-850 text-slate-800 dark:text-ice-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-xs font-semibold mb-1">FC (bpm)</label>
            <input
              type="text"
              value={vitals.fc}
              onChange={(e) => setVitals({ ...vitals, fc: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-850 text-slate-800 dark:text-ice-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-xs font-semibold mb-1">FR (irpm)</label>
            <input
              type="text"
              value={vitals.fr}
              onChange={(e) => setVitals({ ...vitals, fr: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-850 text-slate-800 dark:text-ice-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-xs font-semibold mb-1">SatO2 (%)</label>
            <input
              type="text"
              value={vitals.sat}
              onChange={(e) => setVitals({ ...vitals, sat: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-850 text-slate-800 dark:text-ice-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-xs font-semibold mb-1">TAX (ºC)</label>
            <input
              type="text"
              value={vitals.tax}
              onChange={(e) => setVitals({ ...vitals, tax: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-850 text-slate-800 dark:text-ice-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>
        </div>

        {/* Exame Físico */}
        <div>
          <UndoableTextarea
            value={exameFisico}
            onChange={setExameFisico}
            rows={5}
          />

          {/* Sugestão de Texto da IA para Exame Físico com engavetar */}
          {!hideAiBoxes && aiResults.physicalExamSuggestion && (
            <AIDrawer
              title="Sugestão da IA para Exame Físico:"
              onImplement={handleImplementExameFisico}
              onUndo={handleUndoExameFisico}
              canUndo={prevExameFisico !== null}
              triggerUpdate={aiResults.physicalExamSuggestion}
            >
              <p className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-[#1a1a1a] p-2.5 rounded border border-[#ececeb] dark:border-[#2a2a2a]">
                {aiResults.physicalExamSuggestion}
              </p>
            </AIDrawer>
          )}
        </div>

        {/* Box de Manobras Sugeridas pela IA com engavetar */}
        {!hideAiBoxes && aiResults.physicalExamMissingManeuvers && aiResults.physicalExamMissingManeuvers.length > 0 && (
          <AIDrawer
            title="Manobras e partes do exame físico recomendadas para investigar (IA):"
            variant="blue"
            triggerUpdate={aiResults.physicalExamMissingManeuvers}
          >
            <ul className="list-disc list-inside text-blue-800 dark:text-ice-300 space-y-0.5 pl-1 text-xs">
              {aiResults.physicalExamMissingManeuvers.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          </AIDrawer>
        )}
      </section>

      {/* HIPÓTESE DIAGNÓSTICA */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              HIPÓTESE DIAGNÓSTICA
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <AIActionButton
              label="Gerar Hipóteses com IA"
              onExecute={runAiDiagnostico}
              isLoading={!!aiLoading.diagnostico}
              promptKey="diagnostico"
              currentPrompt={prompts.diagnostico}
              onSavePrompt={(p) => handleSavePrompt('diagnostico', p)}
              onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('diagnostico', p) : undefined}
              onResetPrompt={() => handleResetSinglePrompt('diagnostico')}
              contextPayload={getCasePayload('payloadDiagnostico')}
              payloadTemplate={getPayloadTemplate('payloadDiagnostico')}
              onSavePayloadTemplate={(t) => handleSaveTemplate('payloadDiagnostico', t)}
              onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadDiagnostico', t) : undefined}
              onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadDiagnostico')}
            />
            <AIActionButton
              label="Gerar Prescrições e Orientações"
              actionIcon={<Pill className="w-4 h-4" />}
              onExecute={runAiConduta}
              isLoading={!!aiLoading.conduta}
              promptKey="conduta"
              currentPrompt={prompts.conduta}
              onSavePrompt={(p) => handleSavePrompt('conduta', p)}
              onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('conduta', p) : undefined}
              onResetPrompt={() => handleResetSinglePrompt('conduta')}
              contextPayload={getCasePayload('payloadConduta')}
              payloadTemplate={getPayloadTemplate('payloadConduta')}
              onSavePayloadTemplate={(t) => handleSaveTemplate('payloadConduta', t)}
              onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadConduta', t) : undefined}
              onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadConduta')}
            />
          </div>
        </div>

        {/* Compulsory Notification Alert com engavetar */}
        {!hideAiBoxes && aiResults.isCompulsoryNotification && (
          <AIDrawer
            title="ATENÇÃO (SINAN): Hipótese de Notificação Compulsória"
            icon={<ShieldAlert className="w-4 h-4 text-rose-500" />}
            variant="rose"
          >
            <p className="text-xs text-rose-900 dark:text-rose-200 font-semibold">
              📋 Hipótese sujeita a Notificação Compulsória! Preencher ficha do agravo.
            </p>
          </AIDrawer>
        )}

        {/* Clinical Scores Suggestion com engavetar */}
        {!hideAiBoxes && aiResults.clinicalScores && aiResults.clinicalScores.length > 0 && (
          <AIDrawer
            title="Escores Clínicos Automatizados (IA):"
            variant="indigo"
            triggerUpdate={aiResults.clinicalScores}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {aiResults.clinicalScores.map((s, idx) => (
                <div key={idx} className="bg-white dark:bg-navy-850 p-2 rounded border border-indigo-100 dark:border-slate-800">
                  <strong className="text-indigo-800 dark:text-ice-300">{s.name}:</strong> {s.score} — {s.interpretation}
                </div>
              ))}
            </div>
          </AIDrawer>
        )}

        {/* Hipótese Principal e CID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Coluna 1: Hipóteses Diagnósticas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs">
                HIPÓTESE DIAGNÓSTICA PRINCIPAL
              </label>
            </div>
            <input
              type="text"
              value={aiResults.mainHypothesis || ''}
              onChange={(e) => setAiResults({ ...aiResults, mainHypothesis: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />

            {/* Ranking de Hipóteses (Principal e Diferenciais) */}
            {!hideAiBoxes && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Ranking de Hipóteses (IA)</span>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 min-h-[42px] max-h-36 overflow-y-auto bg-slate-50/50 dark:bg-navy-900">
                  {displayedHypotheses.length > 0 ? (
                    displayedHypotheses.map((h, idx) => {
                      const isSelected = selectedHypothesisIdx === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setAiResults((prev) => ({ ...prev, mainHypothesis: h.nome }));
                            showToast(`Hipótese "${h.nome}" transferida para o campo principal!`);
                          }}
                          className={`px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-ice-500/15 dark:bg-ice-500/20 text-ice-900 dark:text-ice-100 font-semibold border-l-2 border-l-ice-500'
                              : 'hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-300'
                          }`}
                          title="Clique para transferir para a caixa de Hipótese Diagnóstica Principal"
                        >
                          <div className="truncate pr-2 flex items-center gap-1.5 min-w-0">
                            {isSelected && <Check className="w-3.5 h-3.5 text-ice-500 shrink-0" />}
                            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="truncate text-slate-800 dark:text-ice-200">
                              {h.nome}
                            </span>
                            {h.tipo && (
                              <span className={`text-[9px] uppercase px-1 py-0.2 rounded shrink-0 font-medium ${
                                h.tipo.toLowerCase() === 'principal'
                                  ? 'bg-ice-500/20 text-ice-700 dark:text-ice-300'
                                  : 'bg-slate-200 dark:bg-navy-800 text-slate-600 dark:text-slate-400'
                              }`}>
                                {h.tipo}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${getProbBadgeClass(h.prob)}`}>
                            {h.prob}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-2.5 text-xs text-slate-400 dark:text-slate-500 italic text-center">
                      Nenhuma hipótese gerada ainda.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Coluna 2: CID */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs">
                CID
              </label>
            </div>
            <input
              type="text"
              value={aiResults.selectedCid || ''}
              onChange={(e) => setAiResults({ ...aiResults, selectedCid: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />

            {/* Ranking de CIDs */}
            {!hideAiBoxes && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Ranking de CID-10 (IA)</span>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 min-h-[42px] max-h-36 overflow-y-auto bg-slate-50/50 dark:bg-navy-900">
                  {aiResults.cidRankings && aiResults.cidRankings.length > 0 ? (
                    aiResults.cidRankings.map((c, idx) => {
                      const isSelected = selectedCidIdx === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const val = `${c.cid} - ${c.desc}`;
                            setAiResults((prev) => ({ ...prev, selectedCid: val }));
                          }}
                          className={`px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-ice-500/15 dark:bg-ice-500/20 text-ice-900 dark:text-ice-100 font-semibold border-l-2 border-l-ice-500'
                              : 'hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-300'
                          }`}
                          title="Clique para definir este CID no atendimento"
                        >
                          <div className="truncate pr-2 flex items-center gap-1.5 min-w-0">
                            {isSelected && <Check className="w-3.5 h-3.5 text-ice-500 shrink-0" />}
                            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-mono font-bold text-slate-800 dark:text-ice-200 shrink-0">
                              {c.cid}
                            </span>
                            <span className="truncate text-slate-600 dark:text-slate-300">
                              {c.desc}
                            </span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${getProbBadgeClass(c.prob)}`}>
                            {c.prob}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-2.5 text-xs text-slate-400 dark:text-slate-500 italic text-center">
                      Nenhum CID gerado ainda.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CONDUTAS & PRESCRIÇÕES */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              CONDUTAS & PRESCRIÇÕES
            </h2>
            {susFilter && (
              <span className="text-[11px] bg-ice-500/15 text-ice-700 dark:text-ice-300 px-2 py-0.5 rounded-full font-semibold">
                SUS/RENAME Ativo
              </span>
            )}
          </div>
        </div>

        {/* Tetanus/Rabies Warning if present com engavetar */}
        {!hideAiBoxes && aiResults.tetanusRabiesAlert && (
          <AIDrawer
            title="Alerta de Profilaxia Antitetânica / Antirrábica (IA):"
            variant="blue"
          >
            <span className="text-xs text-blue-900 dark:text-ice-200 font-medium">
              💉 {aiResults.tetanusRabiesAlert}
            </span>
          </AIDrawer>
        )}

        {/* Safety Disclaimers com engavetar */}
        {!hideAiBoxes && aiResults.medicationDisclaimers && aiResults.medicationDisclaimers.length > 0 && (
          <AIDrawer
            title="Alertas de Segurança Farmacológica (IA):"
            variant="blue"
            triggerUpdate={aiResults.medicationDisclaimers}
          >
            <div className="space-y-1.5 text-xs">
              {aiResults.medicationDisclaimers.map((d, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border text-xs flex items-start gap-2.5 bg-blue-50/50 dark:bg-navy-900/60 border-blue-200/60 dark:border-blue-900/50 text-blue-950 dark:text-ice-200"
                >
                  <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-ice-300 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">{d.med}:</strong> {d.note}
                  </div>
                </div>
              ))}
            </div>
          </AIDrawer>
        )}

        {/* Medications suggested: Unit vs Home */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/40 dark:bg-navy-900/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="font-bold text-slate-800 dark:text-ice-100 text-xs block uppercase tracking-wide">
                PRESCRIÇÃO INTERNA
              </span>
              <MedicationSearchDropdown
                boxType="interna"
                peso={patient.peso}
                onSelectMedication={(opt) => {
                  const current = Array.isArray(aiResults.unitMedications)
                    ? aiResults.unitMedications.join('\n\n').trim()
                    : (aiResults.unitMedications || '').trim();
                  const updated = appendMedicationToPrescription(current, opt.fullText, opt.route);
                  setAiResults({ ...aiResults, unitMedications: [updated] });
                }}
              />
            </div>
            <UndoableTextarea
              value={Array.isArray(aiResults.unitMedications) ? aiResults.unitMedications.join('\n\n') : (aiResults.unitMedications || '')}
              onChange={(val) =>
                setAiResults({ ...aiResults, unitMedications: val ? [val] : [] })
              }
              rows={4}
            />
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/40 dark:bg-navy-900/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="font-bold text-slate-800 dark:text-ice-100 text-xs block uppercase tracking-wide">
                PRESCRIÇÃO DOMICILIAR
              </span>
              <MedicationSearchDropdown
                boxType="domiciliar"
                peso={patient.peso}
                onSelectMedication={(opt) => {
                  const current = Array.isArray(aiResults.homeMedications)
                    ? aiResults.homeMedications.join('\n\n').trim()
                    : (aiResults.homeMedications || '').trim();
                  const updated = appendMedicationToPrescription(current, opt.fullText, opt.route);
                  setAiResults({ ...aiResults, homeMedications: [updated] });
                }}
              />
            </div>
            <UndoableTextarea
              value={Array.isArray(aiResults.homeMedications) ? aiResults.homeMedications.join('\n\n') : (aiResults.homeMedications || '')}
              onChange={(val) =>
                setAiResults({ ...aiResults, homeMedications: val ? [val] : [] })
              }
              rows={4}
            />
          </div>
        </div>

        {/* Lab & Imaging Requests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/40 dark:bg-navy-900/60 space-y-2">
            <span className="font-bold text-slate-800 dark:text-ice-100 text-xs block uppercase tracking-wide">
              EXAMES LABORATORIAIS
            </span>
            <UndoableTextarea
              value={aiResults.orderedLabs || ''}
              onChange={(val) => setAiResults({ ...aiResults, orderedLabs: val })}
              rows={3}
            />
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/40 dark:bg-navy-900/60 space-y-2">
            <span className="font-bold text-slate-800 dark:text-ice-100 text-xs block uppercase tracking-wide">
              EXAMES DE IMAGEM
            </span>
            <UndoableTextarea
              value={aiResults.orderedImages || ''}
              onChange={(val) => setAiResults({ ...aiResults, orderedImages: val })}
              rows={3}
            />
          </div>
        </div>
      </section>

      {/* ORIENTAÇÕES E SINAIS DE ALARME */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            ORIENTAÇÕES E SINAIS DE ALARME
          </h2>
        </div>

        {/* 4 Caixas de Texto: 2 para Prontuário, 2 para Receita */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bloco 1: PRONTUÁRIO */}
          <div className="space-y-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-navy-900/40">
            <h3 className="text-xs font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              PRONTUÁRIO
            </h3>
            <UndoableTextarea
              label="Orientações Gerais"
              hideActions={true}
              value={aiResults.techOrientations || ''}
              onChange={(val) => setAiResults({ ...aiResults, techOrientations: val })}
              rows={3}
            />
            <UndoableTextarea
              label="Sinais de Alarme"
              hideActions={true}
              value={aiResults.techAlarmSignals || ''}
              onChange={(val) => setAiResults({ ...aiResults, techAlarmSignals: val })}
              rows={3}
            />
          </div>

          {/* Bloco 2: RECEITUÁRIO */}
          <div className="space-y-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-navy-900/40">
            <h3 className="text-xs font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              RECEITUÁRIO
            </h3>
            <UndoableTextarea
              label="Orientações Gerais"
              hideActions={true}
              value={aiResults.layOrientations || ''}
              onChange={(val) => setAiResults({ ...aiResults, layOrientations: val })}
              rows={3}
            />
            <UndoableTextarea
              label="Sinais de Alarme"
              hideActions={true}
              value={aiResults.layAlarmSignals || ''}
              onChange={(val) => setAiResults({ ...aiResults, layAlarmSignals: val })}
              rows={3}
            />
          </div>
        </div>
      </section>

      {/* DOCUMENTOS RÁPIDOS */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              DOCUMENTOS RÁPIDOS
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveDocDrawer(activeDocDrawer === 'atestado' ? null : 'atestado')}
              className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 shadow-2xs ${
                activeDocDrawer === 'atestado'
                  ? 'bg-slate-900 text-white dark:bg-[#303030] dark:text-white border-slate-900 dark:border-[#484848]'
                  : 'bg-white dark:bg-[#202020] border-slate-200 dark:border-[#333] text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#262626]'
              }`}
            >
              <span>GERAR ATESTADO</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDocDrawer(activeDocDrawer === 'relatorio' ? null : 'relatorio')}
              className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 shadow-2xs ${
                activeDocDrawer === 'relatorio'
                  ? 'bg-slate-900 text-white dark:bg-[#303030] dark:text-white border-slate-900 dark:border-[#484848]'
                  : 'bg-white dark:bg-[#202020] border-slate-200 dark:border-[#333] text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#262626]'
              }`}
            >
              <span>GERAR RELATÓRIO</span>
            </button>
          </div>
        </div>

        {/* Gaveta Atestado */}
        {activeDocDrawer === 'atestado' && (
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-navy-900/60 space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                {/* Dias */}
                <div className="flex items-center gap-1 bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#383838] px-2 py-0.5 rounded-md text-xs">
                  <span className="text-slate-500 dark:text-neutral-400 font-medium">Dias:</span>
                  <input
                    type="text"
                    value={diasAtestado}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 2);
                      setDiasAtestado(clean);
                    }}
                    onBlur={() => {
                      const n = parseInt(diasAtestado, 10);
                      if (n > 0) setDiasAtestado(n <= 9 ? `0${n}` : String(n));
                      else setDiasAtestado('01');
                    }}
                    className="w-8 text-center font-bold text-slate-800 dark:text-ice-100 bg-transparent focus:outline-hidden"
                  />
                </div>

                {/* Toggle CID */}
                <button
                  type="button"
                  onClick={() => setIncluirCid(!incluirCid)}
                  className={`h-7 px-2 rounded-md text-xs font-medium border transition-colors ${
                    incluirCid
                      ? 'bg-slate-900 text-white dark:bg-[#303030] dark:text-white border-slate-900 dark:border-[#484848]'
                      : 'bg-white dark:bg-[#202020] border-slate-200 dark:border-[#333] text-slate-600 dark:text-neutral-400 hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                  }`}
                >
                  <span>{incluirCid ? 'Com CID' : 'Sem CID'}</span>
                </button>

                {/* CPF */}
                <div className="flex items-center gap-1 bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#383838] px-2 py-0.5 rounded-md text-xs">
                  <span className="text-slate-500 dark:text-neutral-400 font-medium">CPF:</span>
                  <input
                    type="text"
                    value={patient.cpf || ''}
                    onChange={(e) => setPatient({ ...patient, cpf: e.target.value })}
                    className="w-24 text-center text-xs text-slate-800 dark:text-ice-100 bg-transparent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCompileAtestado}
                  className="h-7 px-2.5 text-xs font-medium text-slate-700 dark:text-neutral-200 bg-white dark:bg-[#202020] hover:bg-slate-50 dark:hover:bg-[#282828] border border-slate-200 dark:border-[#383838] rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Compilar</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyAtestado}
                  className="h-7 px-2.5 text-xs font-medium text-slate-700 dark:text-neutral-200 bg-white dark:bg-[#202020] hover:bg-slate-50 dark:hover:bg-[#282828] border border-slate-200 dark:border-[#383838] rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                >
                  {copiedDoc === 'atestado' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar</span>
                </button>
              </div>
            </div>

            <UndoableTextarea
              value={documents?.atestado || ''}
              onChange={(val) => setDocuments && setDocuments((prev) => ({ ...prev, atestado: val }))}
              rows={6}
              className="font-mono text-xs leading-relaxed"
            />
          </div>
        )}

        {/* Gaveta Relatório */}
        {activeDocDrawer === 'relatorio' && (
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-navy-900/60 space-y-3 animate-in fade-in duration-150">
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wide">
                Delimitação / Instrução Específica para a IA:
              </span>
              <textarea
                value={relatorioCustomInstruction}
                onChange={(e) => setRelatorioCustomInstruction(e.target.value)}
                rows={2}
                placeholder=""
                className="w-full text-xs p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-950 text-slate-800 dark:text-neutral-200 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wide">
                Texto do Relatório:
              </span>
              <div className="flex items-center gap-1.5">
                {runAiEncaminhamento && (
                  <button
                    type="button"
                    onClick={handleRunAiRelatorio}
                    disabled={!!aiLoading.encaminhamento}
                    className="h-7 px-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-[#303030] hover:bg-slate-800 dark:hover:bg-[#383838] rounded-md transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    <span>{aiLoading.encaminhamento ? 'Gerando...' : 'Gerar com IA'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCompileRelatorio}
                  className="h-7 px-2.5 text-xs font-medium text-slate-700 dark:text-neutral-200 bg-white dark:bg-[#202020] hover:bg-slate-50 dark:hover:bg-[#282828] border border-slate-200 dark:border-[#383838] rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Compilar</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyRelatorio}
                  className="h-7 px-2.5 text-xs font-medium text-slate-700 dark:text-neutral-200 bg-white dark:bg-[#202020] hover:bg-slate-50 dark:hover:bg-[#282828] border border-slate-200 dark:border-[#383838] rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                >
                  {copiedDoc === 'relatorio' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar</span>
                </button>
              </div>
            </div>

            <UndoableTextarea
              value={documents?.encaminhamento || ''}
              onChange={(val) => setDocuments && setDocuments((prev) => ({ ...prev, encaminhamento: val }))}
              rows={6}
              className="font-mono text-xs leading-relaxed"
            />
          </div>
        )}
      </section>

      {/* CONDUTAS */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            CONDUTAS
          </h2>
          {runAiGerarCondutas && (
            <AIActionButton
              label="Gerar Condutas com IA"
              onExecute={runAiGerarCondutas}
              isLoading={!!aiLoading.gerarCondutas}
              promptKey="gerarCondutas"
              currentPrompt={prompts.gerarCondutas || DEFAULT_GERAR_CONDUTAS_PROMPT}
              onSavePrompt={(p) => handleSavePrompt('gerarCondutas', p)}
              onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('gerarCondutas', p) : undefined}
              onResetPrompt={() => handleResetSinglePrompt('gerarCondutas')}
              contextPayload={getCasePayload('payloadConduta')}
              payloadTemplate={getPayloadTemplate('payloadConduta')}
              onSavePayloadTemplate={(t) => handleSaveTemplate('payloadConduta', t)}
              onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadConduta', t) : undefined}
              onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadConduta')}
            />
          )}
        </div>

        <UndoableTextarea
          value={condutas}
          onChange={setCondutas}
          rows={4}
        />

        {/* Sugestão da IA para Condutas com engavetar */}
        {!hideAiBoxes && aiResults.condutasSuggestion && condutas !== aiResults.condutasSuggestion && (
          <AIDrawer
            title="Sugestão da IA para Condutas:"
            onImplement={handleImplementCondutas}
            onUndo={handleUndoCondutas}
            canUndo={prevCondutas !== null}
            triggerUpdate={aiResults.condutasSuggestion}
          >
            <p className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-[#1a1a1a] p-2.5 rounded border border-[#ececeb] dark:border-[#2a2a2a]">
              {aiResults.condutasSuggestion}
            </p>
          </AIDrawer>
        )}

        {/* Botões de Cópia Rápida */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Prontuário */}
          <button
            type="button"
            onClick={handleCopyProntuario}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              copiedDoc === 'prontuario'
                ? 'bg-emerald-500/[0.04] dark:bg-emerald-400/[0.06] text-emerald-700/90 dark:text-emerald-300/90 border-emerald-500/25 dark:border-emerald-500/20 font-semibold ring-1 ring-emerald-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            {copiedDoc === 'prontuario' ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" />
            ) : (
              <Copy className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-neutral-400" />
            )}
            <span className="truncate">Copiar Prontuário</span>
          </button>

          {/* Receita */}
          <button
            type="button"
            onClick={handleCopyReceita}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              copiedDoc === 'receita'
                ? 'bg-emerald-500/[0.04] dark:bg-emerald-400/[0.06] text-emerald-700/90 dark:text-emerald-300/90 border-emerald-500/25 dark:border-emerald-500/20 font-semibold ring-1 ring-emerald-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            {copiedDoc === 'receita' ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" />
            ) : (
              <Copy className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-neutral-400" />
            )}
            <span className="truncate">Copiar Receita</span>
          </button>

          {/* Atestado */}
          <button
            type="button"
            onClick={handleCopyAtestado}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              copiedDoc === 'atestado'
                ? 'bg-emerald-500/[0.04] dark:bg-emerald-400/[0.06] text-emerald-700/90 dark:text-emerald-300/90 border-emerald-500/25 dark:border-emerald-500/20 font-semibold ring-1 ring-emerald-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            {copiedDoc === 'atestado' ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" />
            ) : (
              <Copy className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-neutral-400" />
            )}
            <span className="truncate">Copiar Atestado</span>
          </button>

          {/* Relatório */}
          <button
            type="button"
            onClick={handleCopyRelatorio}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              copiedDoc === 'relatorio'
                ? 'bg-emerald-500/[0.04] dark:bg-emerald-400/[0.06] text-emerald-700/90 dark:text-emerald-300/90 border-emerald-500/25 dark:border-emerald-500/20 font-semibold ring-1 ring-emerald-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            {copiedDoc === 'relatorio' ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" />
            ) : (
              <Copy className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-neutral-400" />
            )}
            <span className="truncate">Copiar Relatório</span>
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* DESFECHO (ÚLTIMO BOX DA PÁGINA)                          */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#2e2e2e] rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              DESFECHO
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Alta */}
          <button
            type="button"
            onClick={() => handleSelectOutcome('alta')}
            className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              aiResults.clinicalOutcome === 'alta'
                ? 'bg-emerald-500/[0.04] dark:bg-emerald-400/[0.06] text-emerald-700/90 dark:text-emerald-300/90 border-emerald-500/25 dark:border-emerald-500/20 font-semibold ring-1 ring-emerald-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <Home className={`w-3.5 h-3.5 shrink-0 ${aiResults.clinicalOutcome === 'alta' ? 'text-emerald-600/80 dark:text-emerald-400/80' : ''}`} />
            <span>Alta Médica</span>
          </button>

          {/* Observação */}
          <button
            type="button"
            onClick={() => handleSelectOutcome('observacao')}
            className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              aiResults.clinicalOutcome === 'observacao'
                ? 'bg-amber-500/[0.04] dark:bg-amber-400/[0.06] text-amber-700/90 dark:text-amber-300/90 border-amber-500/25 dark:border-amber-500/20 font-semibold ring-1 ring-amber-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <Bed className={`w-3.5 h-3.5 shrink-0 ${aiResults.clinicalOutcome === 'observacao' ? 'text-amber-600/80 dark:text-amber-400/80' : ''}`} />
            <span>Observação</span>
          </button>

          {/* Internação */}
          <button
            type="button"
            onClick={() => handleSelectOutcome('internacao')}
            className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              aiResults.clinicalOutcome === 'internacao'
                ? 'bg-indigo-500/[0.04] dark:bg-indigo-400/[0.06] text-indigo-700/90 dark:text-indigo-300/90 border-indigo-500/25 dark:border-indigo-500/20 font-semibold ring-1 ring-indigo-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 shrink-0 ${aiResults.clinicalOutcome === 'internacao' ? 'text-indigo-600/80 dark:text-indigo-400/80' : ''}`} />
            <span>Internação</span>
          </button>

          {/* Transferência */}
          <button
            type="button"
            onClick={() => handleSelectOutcome('transferencia')}
            className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              aiResults.clinicalOutcome === 'transferencia'
                ? 'bg-rose-500/[0.04] dark:bg-rose-400/[0.06] text-rose-700/90 dark:text-rose-300/90 border-rose-500/25 dark:border-rose-500/20 font-semibold ring-1 ring-rose-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <Ambulance className={`w-3.5 h-3.5 shrink-0 ${aiResults.clinicalOutcome === 'transferencia' ? 'text-rose-600/80 dark:text-rose-400/80' : ''}`} />
            <span>Transferência</span>
          </button>
        </div>

        {/* CAMPOS AO DEFINIR OBSERVAÇÃO */}
        {aiResults.clinicalOutcome === 'observacao' && (
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-[#202020] space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-ice-100">
              <span className="flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                Observação
              </span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                Início: {observation.startedAt || 'agora'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Em quanto tempo reavaliar */}
              <div>
                <label className="block text-slate-700 dark:text-neutral-300 text-xs font-medium mb-1">
                  Em quanto tempo reavaliar
                </label>
                <div className="relative">
                  <select
                    value={observation.revaluationTimeMinutes || 120}
                    onChange={(e) =>
                      setObservation((prev) => ({
                        ...prev,
                        revaluationTimeMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  >
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1 hora e meia</option>
                    <option value={120}>2 horas</option>
                    <option value={150}>2 horas e meia</option>
                    <option value={180}>3 horas</option>
                    <option value={240}>4 horas</option>
                    <option value={360}>6 horas</option>
                  </select>
                </div>
              </div>

              {/* O que reavaliar */}
              <div className="md:col-span-2">
                <label className="block text-slate-700 dark:text-neutral-300 text-xs font-medium mb-1">
                  O que reavaliar
                </label>
                <input
                  type="text"
                  value={observation.whatToReevaluate || ''}
                  onChange={(e) =>
                    setObservation((prev) => ({
                      ...prev,
                      whatToReevaluate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#383838] bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-400 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sugestões da IA para Desfecho, Encaminhamentos e Atestado (Itens 8, 9 e 10) */}
        {!hideAiBoxes && (aiResults.outcomeReason || aiResults.referralNeeded || aiResults.medicalLeaveNeeded) && (
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {aiResults.outcomeReason && (
              <div className="flex items-start gap-1.5">
                <span className="shrink-0">🎯</span>
                <span>
                  <strong>Desfecho Sugerido:</strong>{' '}
                  <span className="font-semibold text-slate-800 dark:text-ice-100">
                    {(aiResults.suggestedOutcome || aiResults.clinicalOutcome) === 'alta'
                      ? 'Alta orientada'
                      : (aiResults.suggestedOutcome || aiResults.clinicalOutcome) === 'observacao'
                      ? 'Observação'
                      : (aiResults.suggestedOutcome || aiResults.clinicalOutcome) === 'internacao'
                      ? 'Internação'
                      : (aiResults.suggestedOutcome || aiResults.clinicalOutcome) === 'transferencia'
                      ? 'Transferência'
                      : (aiResults.suggestedOutcome || aiResults.clinicalOutcome) || 'Alta'}
                  </span>
                  {' — '}{aiResults.outcomeReason}
                </span>
              </div>
            )}
            {aiResults.referralNeeded && (
              <div className="flex items-start gap-1.5">
                <span className="shrink-0">🏥</span>
                <span>
                  <strong>Encaminhamento UBS / Ambulatório:</strong>{' '}
                  {aiResults.referralReason || 'Seguimento na atenção básica'}
                </span>
              </div>
            )}
            {aiResults.medicalLeaveNeeded && (
              <div className="flex items-start gap-1.5">
                <span className="shrink-0">📝</span>
                <span>
                  <strong>Atestado Médico:</strong>{' '}
                  {aiResults.medicalLeaveDays || '01 dia'} ({aiResults.medicalLeaveReason || 'Repouso'})
                </span>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
