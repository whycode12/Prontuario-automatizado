import React, { useState, useMemo } from 'react';
import {
  FileText,
  Home,
  Bed,
  Building2,
  Ambulance,
  Pill,
  Check,
  Copy,
  ShieldAlert
} from 'lucide-react';
import type {
  ObservationData,
  AIResult,
  SystemTemplates,
  SystemPrompts,
  PatientData,
  FinalDocuments
} from '../types';
import type { TagContextData } from '../utils/templateTags';
import type { CompilableDocType } from '../utils/documentCompiler';
import { buildDocument, generateEvolucaoText } from '../utils/documentCompiler';
import { UndoableTextarea } from '../components/UndoableTextarea';
import { AIActionButton } from '../components/AIActionButton';
import { TemplateEditorButton } from '../components/TemplateEditorButton';
import { AIDrawer } from '../components/AIDrawer';
import { MedicationSearchDropdown } from '../components/MedicationSearchDropdown';
import { appendMedicationToPrescription } from '../services/receituarioService';
import { DEFAULT_GERAR_CONDUTAS_PROMPT } from '../hooks/useAiWorkflow';

interface EvolucaoViewProps {
  patient: PatientData;
  setPatient: React.Dispatch<React.SetStateAction<PatientData>>;
  patientName: string;
  observation: ObservationData;
  setObservation: React.Dispatch<React.SetStateAction<ObservationData>>;
  examResults: string;
  setExamResults: (val: string) => void;
  aiResults: AIResult;
  setAiResults: React.Dispatch<React.SetStateAction<AIResult>>;
  aiLoading: Record<string, boolean>;
  prompts: SystemPrompts;
  templates: SystemTemplates;
  getCasePayload: (key: keyof SystemTemplates) => string;
  getPayloadTemplate: (key: keyof SystemTemplates) => string;
  handleSavePrompt: (key: keyof SystemPrompts, value: string) => void;
  handleSaveGlobalPrompt?: (key: keyof SystemPrompts, value: string) => void;
  handleResetSinglePrompt: (key: keyof SystemPrompts) => void;
  handleSaveTemplate: (key: keyof SystemTemplates, value: string) => void;
  handleSaveGlobalTemplate?: (key: keyof SystemTemplates, value: string) => void;
  handleResetSinglePayloadTemplate: (key: keyof SystemTemplates) => void;
  runAiReavaliacao: () => void;
  runAiConclusaoObs: () => void;
  runAiDiagnosticoEvolucao: () => void;
  runAiCondutaEvolucao: () => void;
  runAiGerarCondutasEvolucao: () => void;
  runAiEncaminhamento?: (customInstruction?: string) => void;
  evolucaoDocument: string;
  setEvolucaoDocument: (val: string) => void;
  generateEvolucaoDocument: () => void;
  documents?: FinalDocuments;
  setDocuments?: React.Dispatch<React.SetStateAction<FinalDocuments>>;
  compileSingleDocument?: (docType: CompilableDocType, customReplacements?: Record<string, string>) => void;
  tagContextData?: TagContextData;
  susFilter?: boolean;
  hideAiBoxes?: boolean;
  showToast?: (msg: string) => void;
}

export const EvolucaoView: React.FC<EvolucaoViewProps> = ({
  patient,
  setPatient,
  patientName: _patientName,
  observation,
  setObservation,
  examResults,
  setExamResults,
  aiResults,
  setAiResults,
  aiLoading,
  prompts,
  templates,
  getCasePayload,
  getPayloadTemplate,
  handleSavePrompt,
  handleSaveGlobalPrompt,
  handleResetSinglePrompt,
  handleSaveTemplate,
  handleSaveGlobalTemplate,
  handleResetSinglePayloadTemplate,
  runAiReavaliacao,
  runAiDiagnosticoEvolucao,
  runAiCondutaEvolucao,
  runAiGerarCondutasEvolucao,
  runAiEncaminhamento,
  evolucaoDocument,
  setEvolucaoDocument,
  generateEvolucaoDocument,
  documents,
  setDocuments,
  compileSingleDocument,
  tagContextData,
  susFilter = false,
  hideAiBoxes = false,
  showToast: _showToast,
}) => {
  const [prevReevaluation, setPrevReevaluation] = useState<string | null>(null);
  const [prevNewConducts, setPrevNewConducts] = useState<string | null>(null);

  const [activeDocDrawer, setActiveDocDrawer] = useState<'atestado' | 'relatorio' | null>(null);
  const [diasAtestado, setDiasAtestado] = useState<string>(() => {
    const raw = aiResults?.medicalLeaveDays || '';
    const m = String(raw).match(/\d+/);
    let n = m ? parseInt(m[0], 10) : 1;
    if (n === 3 || isNaN(n) || n <= 0) n = 1;
    return n <= 9 ? `0${n}` : String(n);
  });
  const [incluirCid, setIncluirCid] = useState<boolean>(true);
  const [relatorioCustomInstruction, setRelatorioCustomInstruction] = useState<string>('');
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);

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

  const handleCopyEvolucao = () => {
    const text = evolucaoDocument || (tagContextData ? generateEvolucaoText(templates.evolucao, tagContextData) : '');
    copyToClipboard(text, 'evolucao');
  };

  const displayedHypotheses = useMemo(() => {
    return aiResults.conclusionHypothesisRankings || aiResults.hypothesisRankings || [];
  }, [aiResults.conclusionHypothesisRankings, aiResults.hypothesisRankings]);

  const displayedCids = useMemo(() => {
    return aiResults.conclusionCidRankings || aiResults.cidRankings || [];
  }, [aiResults.conclusionCidRankings, aiResults.cidRankings]);

  const currentHypothesis = observation.conclusionNewHypothesis || aiResults.mainHypothesis || '';
  const currentCid = observation.conclusionCid || aiResults.selectedCid || '';

  const selectedHypothesisIdx = useMemo(() => {
    if (!currentHypothesis || displayedHypotheses.length === 0) return null;
    const idx = displayedHypotheses.findIndex(
      (h) => h.nome.trim().toLowerCase() === currentHypothesis.trim().toLowerCase()
    );
    return idx >= 0 ? idx : null;
  }, [currentHypothesis, displayedHypotheses]);

  const selectedCidIdx = useMemo(() => {
    if (!currentCid || displayedCids.length === 0) return null;
    const target = currentCid.trim().toLowerCase();
    const idx = displayedCids.findIndex((c) => {
      const full = `${c.cid} - ${c.desc}`.toLowerCase();
      return full === target || c.cid.toLowerCase() === target;
    });
    return idx >= 0 ? idx : null;
  }, [currentCid, displayedCids]);

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

  const currentOutcome = observation.outcome || (observation.inObservation ? 'observacao' : undefined);

  const handleSelectOutcome = (dest: 'alta' | 'observacao' | 'internacao' | 'transferencia') => {
    if (dest === 'observacao') {
      setObservation((prev) => ({
        ...prev,
        outcome: 'observacao',
        inObservation: true,
        startedAt: prev.startedAt || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }));
    } else {
      setObservation((prev) => ({
        ...prev,
        outcome: dest,
        inObservation: false,
      }));
    }
  };

  const handleImplementReevaluation = () => {
    setPrevReevaluation(observation.clinicalReevaluationText);
    setObservation((prev) => ({
      ...prev,
      clinicalReevaluationText: aiResults.reevaluationSuggestion || ''
    }));
  };

  const handleUndoReevaluation = () => {
    if (prevReevaluation !== null) {
      const current = observation.clinicalReevaluationText;
      setObservation((prev) => ({
        ...prev,
        clinicalReevaluationText: prevReevaluation
      }));
      setPrevReevaluation(current);
    }
  };

  const handleImplementNewConducts = () => {
    setPrevNewConducts(observation.newConducts);
    setObservation((prev) => ({
      ...prev,
      newConducts: aiResults.newConductsSuggestion || ''
    }));
  };

  const handleUndoNewConducts = () => {
    if (prevNewConducts !== null) {
      const current = observation.newConducts;
      setObservation((prev) => ({
        ...prev,
        newConducts: prevNewConducts
      }));
      setPrevNewConducts(current);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* 1. RESULTADOS DE EXAMES */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              RESULTADOS DE EXAMES
            </h2>
          </div>
        </div>
        <UndoableTextarea
          value={examResults}
          onChange={setExamResults}
          rows={3}
        />
      </section>

      {/* 2. REAVALIAÇÃO CLÍNICA */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            REAVALIAÇÃO CLÍNICA
          </h2>
          <AIActionButton
            label="Aprimorar Reavaliação com IA"
            onExecute={runAiReavaliacao}
            isLoading={!!aiLoading.reavaliacao}
            promptKey="reavaliacao"
            currentPrompt={prompts.reavaliacao}
            onSavePrompt={(p) => handleSavePrompt('reavaliacao', p)}
            onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('reavaliacao', p) : undefined}
            onResetPrompt={() => handleResetSinglePrompt('reavaliacao')}
            contextPayload={getCasePayload('payloadReavaliacao')}
            payloadTemplate={getPayloadTemplate('payloadReavaliacao')}
            onSavePayloadTemplate={(t) => handleSaveTemplate('payloadReavaliacao', t)}
            onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadReavaliacao', t) : undefined}
            onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadReavaliacao')}
          />
        </div>

        <UndoableTextarea
          value={observation.clinicalReevaluationText}
          onChange={(val) => setObservation({ ...observation, clinicalReevaluationText: val })}
          rows={4}
        />

        {!hideAiBoxes && aiResults.reevaluationSuggestion && (
          <AIDrawer
            title="Sugestão da IA para Reavaliação Clínica:"
            onImplement={handleImplementReevaluation}
            onUndo={handleUndoReevaluation}
            canUndo={prevReevaluation !== null}
            triggerUpdate={aiResults.reevaluationSuggestion}
          >
            <p className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-[#1a1a1a] p-2.5 rounded border border-[#ececeb] dark:border-[#2a2a2a]">
              {aiResults.reevaluationSuggestion}
            </p>
          </AIDrawer>
        )}

        {!hideAiBoxes && aiResults.missingReevaluationChecks && aiResults.missingReevaluationChecks.length > 0 && (
          <AIDrawer
            title="Checagens recomendadas pela IA que faltou investigar na reavaliação:"
            variant="blue"
            triggerUpdate={aiResults.missingReevaluationChecks}
          >
            <ul className="list-disc list-inside text-blue-800 dark:text-ice-300 space-y-0.5 pl-1 text-xs">
              {aiResults.missingReevaluationChecks.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </AIDrawer>
        )}
      </section>

      {/* 3. HIPÓTESE FINAL (IDÊNTICO AO BOX DE HIPÓTESE E CID DE ATENDIMENTO CLÍNICO) */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              HIPÓTESE FINAL
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <AIActionButton
              label="Gerar Hipóteses com IA"
              onExecute={runAiDiagnosticoEvolucao}
              isLoading={!!aiLoading.diagnosticoEvolucao}
              promptKey="diagnostico"
              currentPrompt={prompts.diagnosticoEvolucao || prompts.diagnostico}
              onSavePrompt={(p) => handleSavePrompt('diagnostico', p)}
              onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('diagnostico', p) : undefined}
              onResetPrompt={() => handleResetSinglePrompt('diagnostico')}
              contextPayload={getCasePayload('payloadCaso')}
              payloadTemplate={getPayloadTemplate('payloadCaso')}
              onSavePayloadTemplate={(t) => handleSaveTemplate('payloadCaso', t)}
              onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadCaso', t) : undefined}
              onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadCaso')}
            />
            <AIActionButton
              label="Gerar Prescrições e Orientações"
              actionIcon={<Pill className="w-4 h-4" />}
              onExecute={runAiCondutaEvolucao}
              isLoading={!!aiLoading.condutaEvolucao}
              promptKey="conduta"
              currentPrompt={prompts.condutaEvolucao || prompts.conduta}
              onSavePrompt={(p) => handleSavePrompt('conduta', p)}
              onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('conduta', p) : undefined}
              onResetPrompt={() => handleResetSinglePrompt('conduta')}
              contextPayload={getCasePayload('payloadCaso')}
              payloadTemplate={getPayloadTemplate('payloadCaso')}
              onSavePayloadTemplate={(t) => handleSaveTemplate('payloadCaso', t)}
              onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadCaso', t) : undefined}
              onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadCaso')}
            />
          </div>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Coluna 1: Hipótese Diagnóstica Final */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs">
                HIPÓTESE DIAGNÓSTICA FINAL
              </label>
            </div>
            <input
              type="text"
              value={currentHypothesis}
              onChange={(e) => {
                const val = e.target.value;
                setObservation((prev) => ({ ...prev, conclusionNewHypothesis: val }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />

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
                            setObservation((prev) => ({ ...prev, conclusionNewHypothesis: h.nome }));
                          }}
                          className={`px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-ice-500/15 dark:bg-ice-500/20 text-ice-900 dark:text-ice-100 font-semibold border-l-2 border-l-ice-500'
                              : 'hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-300'
                          }`}
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
              value={currentCid}
              onChange={(e) => {
                const val = e.target.value;
                setObservation((prev) => ({ ...prev, conclusionCid: val }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />

            {!hideAiBoxes && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Ranking de CID-10 (IA)</span>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 min-h-[42px] max-h-36 overflow-y-auto bg-slate-50/50 dark:bg-navy-900">
                  {displayedCids.length > 0 ? (
                    displayedCids.map((c, idx) => {
                      const isSelected = selectedCidIdx === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const val = `${c.cid} - ${c.desc}`;
                            setObservation((prev) => ({ ...prev, conclusionCid: val }));
                          }}
                          className={`px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-ice-500/15 dark:bg-ice-500/20 text-ice-900 dark:text-ice-100 font-semibold border-l-2 border-l-ice-500'
                              : 'hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-300'
                          }`}
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

      {/* 4. CONDUTAS & PRESCRIÇÕES (IDÊNTICO AO ATENDIMENTO CLÍNICO) */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/40 dark:bg-navy-900/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="font-bold text-slate-800 dark:text-ice-100 text-xs block uppercase tracking-wide">
                PRESCRIÇÃO INTERNA
              </span>
              <MedicationSearchDropdown
                boxType="interna"
                peso={patient?.peso}
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
                peso={patient?.peso}
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

      {/* 5. ORIENTAÇÕES E SINAIS DE ALARME (IDÊNTICO AO ATENDIMENTO CLÍNICO) */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            ORIENTAÇÕES E SINAIS DE ALARME
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* 6. DOCUMENTOS RÁPIDOS (IDÊNTICO AO ATENDIMENTO CLÍNICO) */}
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
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeDocDrawer === 'atestado'
                  ? 'bg-slate-900 text-white dark:bg-[#303030] dark:text-white border-slate-900 dark:border-[#484848] font-semibold ring-1 ring-slate-400/30'
                  : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-neutral-400" />
              <span className="truncate">Gerar Atestado</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDocDrawer(activeDocDrawer === 'relatorio' ? null : 'relatorio')}
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeDocDrawer === 'relatorio'
                  ? 'bg-slate-900 text-white dark:bg-[#303030] dark:text-white border-slate-900 dark:border-[#484848] font-semibold ring-1 ring-slate-400/30'
                  : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-neutral-400" />
              <span className="truncate">Gerar Relatório</span>
            </button>
          </div>
        </div>

        {activeDocDrawer === 'atestado' && (
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-navy-900/60 space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
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

                <div className="flex items-center gap-1 bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#383838] px-2 py-0.5 rounded-md text-xs">
                  <span className="text-slate-500 dark:text-neutral-400 font-medium">CPF:</span>
                  <input
                    type="text"
                    value={patient?.cpf || ''}
                    onChange={(e) => setPatient && setPatient({ ...patient, cpf: e.target.value })}
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

      {/* 7. CONDUTAS */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            CONDUTAS
          </h2>
          <AIActionButton
            label="Gerar Condutas com IA"
            onExecute={runAiGerarCondutasEvolucao}
            isLoading={!!aiLoading.gerarCondutasEvolucao}
            promptKey="gerarCondutas"
            currentPrompt={prompts.gerarCondutas || DEFAULT_GERAR_CONDUTAS_PROMPT}
            onSavePrompt={(p) => handleSavePrompt('gerarCondutas', p)}
            onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('gerarCondutas', p) : undefined}
            onResetPrompt={() => handleResetSinglePrompt('gerarCondutas')}
            contextPayload={getCasePayload('payloadCaso')}
            payloadTemplate={getPayloadTemplate('payloadCaso')}
            onSavePayloadTemplate={(t) => handleSaveTemplate('payloadCaso', t)}
            onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadCaso', t) : undefined}
            onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadCaso')}
          />
        </div>

        <UndoableTextarea
          value={observation.newConducts}
          onChange={(val) => setObservation({ ...observation, newConducts: val })}
          rows={4}
        />

        {!hideAiBoxes && aiResults.newConductsSuggestion && observation.newConducts !== aiResults.newConductsSuggestion && (
          <AIDrawer
            title="Sugestão da IA para Condutas:"
            onImplement={handleImplementNewConducts}
            onUndo={handleUndoNewConducts}
            canUndo={prevNewConducts !== null}
            triggerUpdate={aiResults.newConductsSuggestion}
          >
            <p className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-[#1a1a1a] p-2.5 rounded border border-[#ececeb] dark:border-[#2a2a2a]">
              {aiResults.newConductsSuggestion}
            </p>
          </AIDrawer>
        )}

        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2">
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

      {/* 8. DESFECHO */}
      <section className="bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#2e2e2e] rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              DESFECHO
            </h2>
          </div>
        </div>

        {/* Notificação/Sugestão de Desfecho da IA com justificativa */}
        {!hideAiBoxes && aiResults.outcomeReason && (
          <div className="p-3 rounded-lg border border-slate-200 dark:border-[#333] bg-slate-50/60 dark:bg-[#1c1c1c] text-xs space-y-1 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-neutral-200">
              <span className="w-2 h-2 rounded-full bg-slate-600 dark:bg-neutral-400" />
              <span>Sugestão da IA:</span>
              <span className="uppercase text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#2d2d2d] text-slate-700 dark:text-neutral-300 font-bold">
                {aiResults.suggestedOutcome || aiResults.clinicalOutcome}
              </span>
            </div>
            <p className="text-slate-600 dark:text-neutral-400 text-xs leading-relaxed pl-3.5">
              {aiResults.outcomeReason}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Alta */}
          <button
            type="button"
            onClick={() => handleSelectOutcome('alta')}
            className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              currentOutcome === 'alta'
                ? 'bg-emerald-500/[0.04] dark:bg-emerald-400/[0.06] text-emerald-700/90 dark:text-emerald-300/90 border-emerald-500/25 dark:border-emerald-500/20 font-semibold ring-1 ring-emerald-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <Home className={`w-3.5 h-3.5 shrink-0 ${currentOutcome === 'alta' ? 'text-emerald-600/80 dark:text-emerald-400/80' : ''}`} />
            <span>Alta Médica</span>
          </button>

          {/* Observação */}
          <button
            type="button"
            onClick={() => handleSelectOutcome('observacao')}
            className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              currentOutcome === 'observacao'
                ? 'bg-amber-500/[0.04] dark:bg-amber-400/[0.06] text-amber-700/90 dark:text-amber-300/90 border-amber-500/25 dark:border-amber-500/20 font-semibold ring-1 ring-amber-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <Bed className={`w-3.5 h-3.5 shrink-0 ${currentOutcome === 'observacao' ? 'text-amber-600/80 dark:text-amber-400/80' : ''}`} />
            <span>Observação</span>
          </button>

          {/* Internação */}
          <button
            type="button"
            onClick={() => handleSelectOutcome('internacao')}
            className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              currentOutcome === 'internacao'
                ? 'bg-indigo-500/[0.04] dark:bg-indigo-400/[0.06] text-indigo-700/90 dark:text-indigo-300/90 border-indigo-500/25 dark:border-indigo-500/20 font-semibold ring-1 ring-indigo-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 shrink-0 ${currentOutcome === 'internacao' ? 'text-indigo-600/80 dark:text-indigo-400/80' : ''}`} />
            <span>Internação</span>
          </button>

          {/* Transferência */}
          <button
            type="button"
            onClick={() => handleSelectOutcome('transferencia')}
            className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              currentOutcome === 'transferencia'
                ? 'bg-rose-500/[0.04] dark:bg-rose-400/[0.06] text-rose-700/90 dark:text-rose-300/90 border-rose-500/25 dark:border-rose-500/20 font-semibold ring-1 ring-rose-500/20'
                : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <Ambulance className={`w-3.5 h-3.5 shrink-0 ${currentOutcome === 'transferencia' ? 'text-rose-600/80 dark:text-rose-400/80' : ''}`} />
            <span>Transferência</span>
          </button>
        </div>

        {currentOutcome === 'observacao' && (
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
      </section>

      {/* 9. EVOLUÇÃO */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 tracking-wide uppercase">
              EVOLUÇÃO
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <TemplateEditorButton
              label="Evolução"
              templateKey="evolucao"
              currentTemplate={templates.evolucao}
              onSaveTemplate={(t) => handleSaveTemplate('evolucao', t)}
              onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('evolucao', t) : undefined}
            />
            <button
              type="button"
              onClick={generateEvolucaoDocument}
              className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs font-medium"
              title="Compilar Evolução"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Compilar</span>
            </button>
            <button
              type="button"
              onClick={handleCopyEvolucao}
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                copiedDoc === 'evolucao'
                  ? 'bg-emerald-500/[0.04] dark:bg-emerald-400/[0.06] text-emerald-700/90 dark:text-emerald-300/90 border-emerald-500/25 dark:border-emerald-500/20 font-semibold ring-1 ring-emerald-500/20'
                  : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-700 dark:text-neutral-300 hover:border-[#aaa] dark:hover:border-[#555] hover:bg-[#f9f9f9] dark:hover:bg-[#2c2c2c]'
              }`}
              title="Copiar Evolução"
            >
              {copiedDoc === 'evolucao' ? (
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" />
              ) : (
                <Copy className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-neutral-400" />
              )}
              <span>Copiar</span>
            </button>
          </div>
        </div>

        <UndoableTextarea
          value={evolucaoDocument}
          onChange={setEvolucaoDocument}
          rows={10}
          className="font-mono text-xs leading-relaxed"
        />
      </section>
    </div>
  );
};
