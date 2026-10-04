import React from 'react';
import { FileText } from 'lucide-react';
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
  hideAiBoxes?: boolean;
}

export const EvolucaoView: React.FC<EvolucaoViewProps> = ({
  patientName: _patientName,
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
  toggleObservation: _toggleObservation,
  hideAiBoxes = false,
}) => {
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
