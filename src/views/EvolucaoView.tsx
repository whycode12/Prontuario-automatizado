import React from 'react';
import { FileText, Home, Bed, Building2, Ambulance } from 'lucide-react';
import type { ObservationData, AIResult, SystemTemplates, SystemPrompts } from '../types';
import { UndoableTextarea } from '../components/UndoableTextarea';
import { AIActionButton } from '../components/AIActionButton';
import { TemplateEditorButton } from '../components/TemplateEditorButton';
import { AIDrawer } from '../components/AIDrawer';

interface EvolucaoViewProps {
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
  evolucaoDocument: string;
  setEvolucaoDocument: (val: string) => void;
  generateEvolucaoDocument: () => void;
  toggleObservation: () => void;
  hideAiBoxes?: boolean;
}

export const EvolucaoView: React.FC<EvolucaoViewProps> = ({
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
  runAiConclusaoObs,
  evolucaoDocument,
  setEvolucaoDocument,
  generateEvolucaoDocument,
  toggleObservation: _toggleObservation,
  hideAiBoxes = false,
}) => {
  const [prevReevaluation, setPrevReevaluation] = React.useState<string | null>(null);
  const [prevConclusionHypothesis, setPrevConclusionHypothesis] = React.useState<string | null>(null);
  const [prevNewConducts, setPrevNewConducts] = React.useState<string | null>(null);

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

  const handleImplementConclusionHypothesis = () => {
    setPrevConclusionHypothesis(observation.conclusionNewHypothesis);
    setObservation((prev) => ({
      ...prev,
      conclusionNewHypothesis: aiResults.conclusionHypothesisSuggestion || ''
    }));
  };

  const handleUndoConclusionHypothesis = () => {
    if (prevConclusionHypothesis !== null) {
      const current = observation.conclusionNewHypothesis;
      setObservation((prev) => ({
        ...prev,
        conclusionNewHypothesis: prevConclusionHypothesis
      }));
      setPrevConclusionHypothesis(current);
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

      {/* RESULTADOS DE EXAMES */}
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

      {/* REAVALIAÇÃO CLÍNICA */}
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

        {/* Sugestão de Texto da IA para Reavaliação Clínica com engavetar */}
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

        {/* Box de Checagens Faltantes Sugeridas pela IA com engavetar */}
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

      {/* HIPÓTESES E CONDUTAS */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            HIPÓTESES E CONDUTAS
          </h2>
          <AIActionButton
            label="Sugerir Nova Hipótese & Condutas (IA)"
            onExecute={runAiConclusaoObs}
            isLoading={!!aiLoading.conclusaoObs}
            promptKey="conclusaoObs"
            currentPrompt={prompts.conclusaoObs}
            onSavePrompt={(p) => handleSavePrompt('conclusaoObs', p)}
            onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('conclusaoObs', p) : undefined}
            onResetPrompt={() => handleResetSinglePrompt('conclusaoObs')}
            contextPayload={getCasePayload('payloadConclusaoObs')}
            payloadTemplate={getPayloadTemplate('payloadConclusaoObs')}
            onSavePayloadTemplate={(t) => handleSaveTemplate('payloadConclusaoObs', t)}
            onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadConclusaoObs', t) : undefined}
            onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadConclusaoObs')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 dark:text-neutral-300 font-semibold text-xs mb-1.5">
              Nova hipótese diagnóstica
            </label>
            <UndoableTextarea
              value={observation.conclusionNewHypothesis}
              onChange={(val) => setObservation({ ...observation, conclusionNewHypothesis: val })}
              rows={3}
            />

            {/* Sugestão da IA para Nova Hipótese com engavetar */}
            {!hideAiBoxes && aiResults.conclusionHypothesisSuggestion && (
              <AIDrawer
                title="Sugestão da IA para Hipótese:"
                onImplement={handleImplementConclusionHypothesis}
                onUndo={handleUndoConclusionHypothesis}
                canUndo={prevConclusionHypothesis !== null}
                triggerUpdate={aiResults.conclusionHypothesisSuggestion}
              >
                <p className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-[#1a1a1a] p-2.5 rounded border border-[#ececeb] dark:border-[#2a2a2a]">
                  {aiResults.conclusionHypothesisSuggestion}
                </p>
              </AIDrawer>
            )}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-neutral-300 font-semibold text-xs mb-1.5">
              Novas condutas
            </label>
            <UndoableTextarea
              value={observation.newConducts}
              onChange={(val) => setObservation({ ...observation, newConducts: val })}
              rows={3}
            />

            {/* Sugestão da IA para Novas Condutas com engavetar */}
            {!hideAiBoxes && aiResults.newConductsSuggestion && (
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
          </div>
        </div>
      </section>

      {/* DESFECHO */}
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

      {/* EVOLUÇÃO */}
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
              className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
              title="Compilar Evolução"
            >
              <FileText className="w-4 h-4" />
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
