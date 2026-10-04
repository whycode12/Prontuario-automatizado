import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  Home,
  Bed,
  Building2,
  Ambulance,
  ArrowDownToLine
} from 'lucide-react';
import type {
  PatientData,
  VitalSigns,
  HppData,
  AIResult,
  ObservationData,
  SystemTemplates,
  SystemPrompts,
} from '../types';
import { UndoableTextarea } from '../components/UndoableTextarea';
import { AIActionButton } from '../components/AIActionButton';
import { TemplateEditorButton } from '../components/TemplateEditorButton';
import { parseHppText } from '../data/defaults';

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
  runAiOrientacoes: () => void;
  showToast: (msg: string) => void;
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
  runAiOrientacoes,
  showToast,
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
        showToast('Paciente colocado em observação clínica e registrado no leito!');
      }
    } else {
      if (observation.inObservation) {
        setObservation((prev) => ({ ...prev, inObservation: false }));
        showToast('Paciente retirado do leito de observação.');
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* IDENTIFICAÇÃO DO PACIENTE */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
          IDENTIFICAÇÃO
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 text-sm">
          {/* Nome */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Nome Completo ou Iniciais
            </label>
            <input
              type="text"
              value={patient.nome}
              onChange={(e) => setPatient({ ...patient, nome: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>

          {/* Idade */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Idade
            </label>
            <input
              type="text"
              value={patient.idade}
              onChange={(e) => setPatient({ ...patient, idade: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50 text-center"
            />
          </div>

          {/* Sexo com botões estéticos de mesma altura que os inputs */}
          <div className="lg:col-span-2">
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
                <span>Masc</span>
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
                <span>Fem</span>
              </button>
            </div>
          </div>

          {/* Peso */}
          <div className="lg:col-span-2">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Peso (kg)
            </label>
            <input
              type="text"
              value={patient.peso}
              onChange={(e) => setPatient({ ...patient, peso: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>

          {/* Altura */}
          <div className="lg:col-span-2">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Altura (cm)
            </label>
            <input
              type="text"
              placeholder="ex: 175"
              value={patient.altura}
              onChange={(e) => setPatient({ ...patient, altura: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
          </div>

          {/* IMC Calculado Automaticamente */}
          <div className="lg:col-span-2">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              IMC (kg/m²)
            </label>
            <input
              type="text"
              readOnly
              value={computedImc ? `${computedImc}` : ''}
              placeholder="-"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-[#1f1f1f] text-slate-800 dark:text-ice-100 text-sm font-semibold text-center cursor-default"
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
            value={hma}
            onChange={setHma}
            rows={4}
            hideActions={true}
          />

          {/* Sugestão de Texto da IA com botão de implementar */}
          {aiResults.hmaSuggestion && (
            <div className="mt-2.5 p-3 rounded-lg border border-[#e5e5e5] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#202020] space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                  Sugestão da IA para HMA:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHma(aiResults.hmaSuggestion || '');
                    showToast('Sugestão da IA aplicada na HMA!');
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-white dark:bg-[#262626] border border-[#d4d4d4] dark:border-[#404040] text-slate-700 dark:text-neutral-200 hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Substituir texto da HMA por esta sugestão"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Implementar no campo</span>
                </button>
              </div>
              <p className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-[#1a1a1a] p-2.5 rounded border border-[#e5e5e5] dark:border-[#2e2e2e]">
                {aiResults.hmaSuggestion}
              </p>
            </div>
          )}
        </div>

        {/* Box de Omissões Sugeridas pela IA */}
        {aiResults.hmaMissingQuestions && aiResults.hmaMissingQuestions.length > 0 && (
          <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-lg p-3 text-xs space-y-1.5 animate-in fade-in">
            <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              O que faltou investigar neste caso (IA):
            </span>
            <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 space-y-0.5 pl-1 text-xs">
              {aiResults.hmaMissingQuestions.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* HISTÓRIA PATOLÓGICA PREGRESSA (HPP) */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            HISTÓRIA PATOLÓGICA PREGRESSA (HPP)
          </h2>
          <TemplateEditorButton
            label="HPP"
            templateKey="hpp"
            currentTemplate={templates.hpp}
            onSaveTemplate={(t) => {
              handleSaveTemplate('hpp', t);
              setHpp(parseHppText(t));
              showToast('Template de HPP atualizado e aplicado aos campos!');
            }}
            onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => {
              handleSaveGlobalTemplate('hpp', t);
              setHpp(parseHppText(t));
              showToast('Template de HPP definido como padrão global!');
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

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs mb-1">
              Tabagismo
            </label>
            <input
              type="text"
              value={hpp.tabagismo}
              onChange={(e) => setHpp({ ...hpp, tabagismo: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
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

          {/* Sugestão de Texto da IA para Exame Físico */}
          {aiResults.physicalExamSuggestion && (
            <div className="mt-2.5 p-3 rounded-lg border border-[#e5e5e5] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#202020] space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                  Sugestão da IA para Exame Físico:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setExameFisico(aiResults.physicalExamSuggestion || '');
                    showToast('Sugestão da IA aplicada no Exame Físico!');
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-white dark:bg-[#262626] border border-[#d4d4d4] dark:border-[#3e3e3e] text-slate-700 dark:text-neutral-200 hover:bg-[#f0f0f0] dark:hover:bg-[#303030] flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Substituir texto do Exame Físico por esta sugestão"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Implementar no campo</span>
                </button>
              </div>
              <p className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-[#1a1a1a] p-2.5 rounded border border-[#ececeb] dark:border-[#2a2a2a]">
                {aiResults.physicalExamSuggestion}
              </p>
            </div>
          )}
        </div>

        {/* Box de Manobras Sugeridas pela IA */}
        {aiResults.physicalExamMissingManeuvers && aiResults.physicalExamMissingManeuvers.length > 0 && (
          <div className="bg-blue-50/70 dark:bg-navy-900 border border-blue-200 dark:border-blue-800/60 rounded-lg p-3 text-xs space-y-1.5 animate-in fade-in">
            <span className="font-bold text-blue-900 dark:text-ice-200 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-ice-400" />
              Manobras e partes do exame físico recomendadas para investigar (IA):
            </span>
            <ul className="list-disc list-inside text-blue-800 dark:text-ice-300 space-y-0.5 pl-1 text-xs">
              {aiResults.physicalExamMissingManeuvers.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          </div>
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
        </div>

        {/* Compulsory Notification Alert */}
        {aiResults.isCompulsoryNotification && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 p-3 rounded-lg text-xs flex items-center gap-2.5 text-rose-900 dark:text-rose-200 font-semibold animate-in fade-in">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            <span>
              📋 <strong>ATENÇÃO (SINAN):</strong> Hipótese sujeita a Notificação Compulsória! Preencher ficha do agravo.
            </span>
          </div>
        )}

        {/* Clinical Scores Suggestion */}
        {aiResults.clinicalScores && aiResults.clinicalScores.length > 0 && (
          <div className="bg-indigo-50/70 dark:bg-navy-900 border border-indigo-200 dark:border-indigo-800/60 p-3 rounded-lg text-xs space-y-1.5">
            <span className="font-bold text-indigo-900 dark:text-ice-200 text-xs">
              📊 Escores Clínicos Automatizados:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {aiResults.clinicalScores.map((s, idx) => (
                <div key={idx} className="bg-white dark:bg-navy-850 p-2 rounded border border-indigo-100 dark:border-slate-800">
                  <strong className="text-indigo-800 dark:text-ice-300">{s.name}:</strong> {s.score} — {s.interpretation}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hipótese Principal e Diferenciais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1.5">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs">
              Hipótese Diagnóstica Principal
            </label>
            <input
              type="text"
              value={aiResults.mainHypothesis || ''}
              onChange={(e) => setAiResults({ ...aiResults, mainHypothesis: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ice-400/50"
            />
            {aiResults.differentialDiagnoses && aiResults.differentialDiagnoses.length > 0 && (
              <div className="pt-1 text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Diferenciais: </span>
                <span className="text-slate-700 dark:text-ice-300 font-semibold">
                  {aiResults.differentialDiagnoses.join(' • ')}
                </span>
              </div>
            )}
          </div>

          {/* CIDs */}
          <div className="space-y-1.5">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold text-xs">
              CIDs
            </label>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 min-h-[42px] max-h-36 overflow-y-auto bg-slate-50/50 dark:bg-navy-900">
              {aiResults.cidRankings && aiResults.cidRankings.length > 0 ? (
                aiResults.cidRankings.map((c, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono font-bold text-slate-800 dark:text-ice-200">{c.cid}</span>
                      <span className="text-slate-600 dark:text-slate-300 ml-1.5">{c.desc}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        c.prob.toLowerCase().includes('alta')
                          ? 'bg-ice-500/20 text-ice-700 dark:text-ice-300'
                          : 'bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {c.prob}
                    </span>
                  </div>
                ))
              ) : null}
            </div>
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
          <AIActionButton
            label="Sugerir Condutas & Prescrições"
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

        {/* Tetanus/Rabies Warning if present */}
        {aiResults.tetanusRabiesAlert && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-xs flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
            <span>💉 {aiResults.tetanusRabiesAlert}</span>
          </div>
        )}

        {/* Safety Disclaimers */}
        {aiResults.medicationDisclaimers && aiResults.medicationDisclaimers.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-ice-300 block">
              Alertas de Segurança Farmacológica:
            </span>
            <div className="space-y-1.5 text-xs">
              {aiResults.medicationDisclaimers.map((d, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    d.type === 'contraindication'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-semibold'
                      : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {d.type === 'contraindication' ? (
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong>{d.med}:</strong> {d.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medications suggested: Unit vs Home */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/40 dark:bg-navy-900/60 space-y-2">
            <span className="font-bold text-slate-800 dark:text-ice-100 text-xs block uppercase tracking-wide">
              PRESCRIÇÃO INTERNA
            </span>
            <UndoableTextarea
              value={aiResults.unitMedications?.join('\n') || ''}
              onChange={(val) =>
                setAiResults({ ...aiResults, unitMedications: val.split('\n').filter(Boolean) })
              }
              rows={3}
            />
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/40 dark:bg-navy-900/60 space-y-2">
            <span className="font-bold text-slate-800 dark:text-ice-100 text-xs block uppercase tracking-wide">
              PRESCRIÇÃO DOMICILIAR
            </span>
            <UndoableTextarea
              value={aiResults.homeMedications?.join('\n') || ''}
              onChange={(val) =>
                setAiResults({ ...aiResults, homeMedications: val.split('\n').filter(Boolean) })
              }
              rows={3}
            />
          </div>
        </div>

        {/* Lab & Imaging Requests */}
        <div className="space-y-1.5">
          <label className="block text-slate-700 dark:text-ice-200 font-semibold text-xs uppercase tracking-wide">
            EXAMES LABORATORIAIS E DE IMAGEM
          </label>
          <input
            type="text"
            value={[aiResults.orderedLabs, aiResults.orderedImages].filter(Boolean).join(' | ')}
            onChange={(e) => setAiResults({ ...aiResults, orderedLabs: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-800 dark:text-ice-100 focus:outline-none focus:ring-2 focus:ring-ice-400/50 text-sm"
          />
        </div>
      </section>

      {/* CONDUTAS */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            CONDUTAS
          </h2>
        </div>

        <UndoableTextarea
          value={condutas}
          onChange={setCondutas}
          rows={4}
        />
      </section>

      {/* ORIENTAÇÕES E SINAIS DE ALARME */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            ORIENTAÇÕES E SINAIS DE ALARME
          </h2>
          <AIActionButton
            label="Gerar Orientações com IA"
            onExecute={runAiOrientacoes}
            isLoading={!!aiLoading.orientacoes}
            promptKey="orientacoes"
            currentPrompt={prompts.orientacoes}
            onSavePrompt={(p) => handleSavePrompt('orientacoes', p)}
            onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('orientacoes', p) : undefined}
            onResetPrompt={() => handleResetSinglePrompt('orientacoes')}
            contextPayload={getCasePayload('payloadOrientacoes')}
            payloadTemplate={getPayloadTemplate('payloadOrientacoes')}
            onSavePayloadTemplate={(t) => handleSaveTemplate('payloadOrientacoes', t)}
            onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadOrientacoes', t) : undefined}
            onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadOrientacoes')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UndoableTextarea
            label="PRONTUÁRIO"
            value={aiResults.techOrientations || ''}
            onChange={(val) => setAiResults({ ...aiResults, techOrientations: val })}
            rows={3}
          />

          <UndoableTextarea
            label="RECEITA"
            value={aiResults.layOrientations || ''}
            onChange={(val) => setAiResults({ ...aiResults, layOrientations: val })}
            rows={3}
          />
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
          {aiResults.clinicalOutcome === 'observacao' && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 dark:bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              <Bed className="w-3.5 h-3.5" />
              Paciente em Leito de Observação
            </span>
          )}
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

        {/* CAMPOS OBRIGATÓRIOS AO DEFINIR OBSERVAÇÃO */}
        {aiResults.clinicalOutcome === 'observacao' && (
          <div className="p-3.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-[#23201a] space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Parâmetros Obrigatórios da Observação / Leito
              </span>
              <span className="text-[11px] font-normal text-amber-700/90 dark:text-amber-400/80">
                Início: {observation.startedAt || 'agora'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Em quanto tempo reavaliar */}
              <div>
                <label className="block text-slate-700 dark:text-neutral-300 text-xs font-medium mb-1">
                  Em quanto tempo reavaliar? <span className="text-amber-600 dark:text-amber-400 font-bold">*</span>
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
                    className="w-full px-3 py-2 rounded-lg border border-amber-300/80 dark:border-amber-800/80 bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  >
                    <option value={30}>30 minutos (Rápida)</option>
                    <option value={60}>1 hora (60 min)</option>
                    <option value={120}>2 horas (120 min)</option>
                    <option value={240}>4 horas (240 min)</option>
                    <option value={360}>6 horas (360 min)</option>
                  </select>
                </div>
              </div>

              {/* O que reavaliar */}
              <div className="md:col-span-2">
                <label className="block text-slate-700 dark:text-neutral-300 text-xs font-medium mb-1">
                  O que reavaliar? (Pendências / Alvos Clínicos) <span className="text-amber-600 dark:text-amber-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={observation.whatToReevaluate || ''}
                  onChange={(e) =>
                    setObservation((prev) => ({
                      ...prev,
                      whatToReevaluate: e.target.value,
                    }))
                  }
                  placeholder="Ex: Checar resposta analgésica, curva térmica, hemograma e EAS..."
                  className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-neutral-200 text-xs focus:outline-none transition-colors ${
                    !observation.whatToReevaluate?.trim()
                      ? 'border-amber-400 dark:border-amber-600/90 focus:ring-1 focus:ring-amber-500'
                      : 'border-slate-300 dark:border-[#383838] focus:ring-1 focus:ring-neutral-400'
                  }`}
                />
                {!observation.whatToReevaluate?.trim() && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <span>⚠️ Defina o alvo clínico para orientar a equipe no leito de reavaliação.</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Encaminhamentos e Atestado */}
        {(aiResults.referralNeeded || aiResults.medicalLeaveNeeded) && (
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            {aiResults.referralNeeded && (
              <span>
                🏥 <strong>Encaminhamento UBS:</strong> {aiResults.referralReason || 'Seguimento na atenção básica'}
              </span>
            )}
            {aiResults.medicalLeaveNeeded && (
              <span>
                📝 <strong>Atestado:</strong> {aiResults.medicalLeaveDays || '1 dia'} ({aiResults.medicalLeaveReason || 'Repouso'})
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
