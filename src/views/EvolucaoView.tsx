import React from 'react';
import { Bed, AlertTriangle } from 'lucide-react';
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
}

export const EvolucaoView: React.FC<EvolucaoViewProps> = ({
  patientName,
  observation,
  setObservation,
  examResults,
  setExamResults,
  aiResults,
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
  toggleObservation,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Box: Patient status in observation */}
      <section className="bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-950 dark:text-amber-100 uppercase tracking-wide">
                Controle do Leito: {patientName ? `Paciente ${patientName}` : 'Paciente Atual'}
              </h2>
              <span className="text-xs text-amber-800/80 dark:text-amber-300">
                Início: <strong>{observation.startedAt || 'Não iniciado'}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleObservation}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                observation.inObservation
                  ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                  : 'bg-white dark:bg-navy-900 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-navy-800'
              }`}
            >
              {observation.inObservation ? 'EM OBSERVAÇÃO CLÍNICA' : '+ Colocar em Observação'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm pt-1">
          <div>
            <label className="block text-amber-900 dark:text-amber-300 text-xs font-semibold mb-1">
              Tempo para Reavaliação
            </label>
            <select
              value={observation.revaluationTimeMinutes}
              onChange={(e) =>
                setObservation({ ...observation, revaluationTimeMinutes: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <option value={30}>30 minutos (Rápida)</option>
              <option value={60}>1 hora (60 min)</option>
              <option value={120}>2 horas (120 min)</option>
              <option value={240}>4 horas (240 min)</option>
              <option value={360}>6 horas (360 min)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-amber-900 dark:text-amber-300 text-xs font-semibold mb-1">
              O que Reavaliar na Observação (Pendências / Alvos Clínicos)
            </label>
            <input
              type="text"
              value={observation.whatToReevaluate}
              onChange={(e) => setObservation({ ...observation, whatToReevaluate: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </div>
        </div>
      </section>

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
        {aiResults.reevaluationSuggestion && (
          <AIDrawer
            title="Sugestão da IA para Reavaliação Clínica:"
            onImplement={() => {
              setObservation((prev) => ({
                ...prev,
                clinicalReevaluationText: aiResults.reevaluationSuggestion || ''
              }));
            }}
            triggerUpdate={aiResults.reevaluationSuggestion}
          >
            <p className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-[#1a1a1a] p-2.5 rounded border border-[#ececeb] dark:border-[#2a2a2a]">
              {aiResults.reevaluationSuggestion}
            </p>
          </AIDrawer>
        )}

        {/* Box de Checagens Faltantes Sugeridas pela IA com engavetar */}
        {aiResults.missingReevaluationChecks && aiResults.missingReevaluationChecks.length > 0 && (
          <AIDrawer
            title="Checagens recomendadas pela IA que faltou investigar na reavaliação:"
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            variant="amber"
            triggerUpdate={aiResults.missingReevaluationChecks}
          >
            <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 space-y-0.5 pl-1 text-xs">
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
            <label className="block text-slate-700 dark:text-ice-200 font-semibold text-xs mb-1.5">
              Conclusão / Nova Hipótese Diagnóstica
            </label>
            <UndoableTextarea
              value={observation.conclusionNewHypothesis}
              onChange={(val) => setObservation({ ...observation, conclusionNewHypothesis: val })}
              rows={3}
            />

            {/* Sugestão da IA para Nova Hipótese com engavetar */}
            {aiResults.conclusionHypothesisSuggestion && (
              <AIDrawer
                title="Sugestão da IA para Hipótese:"
                onImplement={() => {
                  setObservation((prev) => ({
                    ...prev,
                    conclusionNewHypothesis: aiResults.conclusionHypothesisSuggestion || ''
                  }));
                }}
                triggerUpdate={aiResults.conclusionHypothesisSuggestion}
              >
                <p className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-[#1a1a1a] p-2.5 rounded border border-[#ececeb] dark:border-[#2a2a2a]">
                  {aiResults.conclusionHypothesisSuggestion}
                </p>
              </AIDrawer>
            )}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-ice-200 font-semibold text-xs mb-1.5">
              Novas Condutas Sugeridas (Alta, Prescrição ou Internação)
            </label>
            <UndoableTextarea
              value={observation.newConducts}
              onChange={(val) => setObservation({ ...observation, newConducts: val })}
              rows={3}
            />

            {/* Sugestão da IA para Novas Condutas com engavetar */}
            {aiResults.newConductsSuggestion && (
              <AIDrawer
                title="Sugestão da IA para Condutas:"
                onImplement={() => {
                  setObservation((prev) => ({
                    ...prev,
                    newConducts: aiResults.newConductsSuggestion || ''
                  }));
                }}
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
              className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Compilar Evolução</span>
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
