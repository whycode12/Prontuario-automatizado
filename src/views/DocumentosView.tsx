import React, { useState } from 'react';
import {
  Copy,
  Printer,
  Check,
  Layers,
  FileText,
} from 'lucide-react';
import type { FinalDocuments, SystemTemplates, SystemPrompts, PatientData, AIResult } from '../types';
import { UndoableTextarea } from '../components/UndoableTextarea';
import { AIActionButton } from '../components/AIActionButton';
import { TemplateEditorButton } from '../components/TemplateEditorButton';
import {
  type CompilableDocType,
  DEFAULT_ATESTADO_TEMPLATE,
  DEFAULT_ENCAMINHAMENTO_TEMPLATE,
  DEFAULT_PASSOMETRO_TEMPLATE
} from '../utils/documentCompiler';
import { DEFAULT_PROMPTS } from '../data/defaults';
import { DEFAULT_ENCAMINHAMENTO_PROMPT } from '../hooks/useAiWorkflow';

interface DocumentosViewProps {
  documents: FinalDocuments;
  setDocuments: React.Dispatch<React.SetStateAction<FinalDocuments>>;
  compileAllDocuments: () => void;
  compileSingleDocument: (
    docType: CompilableDocType,
    customReplacements?: Record<string, string>
  ) => void;
  templates: SystemTemplates;
  prompts: SystemPrompts;
  patient?: PatientData;
  setPatient?: React.Dispatch<React.SetStateAction<PatientData>>;
  aiResults?: AIResult;
  handleSaveTemplate: (key: keyof SystemTemplates, value: string) => void;
  handleSaveGlobalTemplate?: (key: keyof SystemTemplates, value: string) => void;
  handleSavePrompt: (key: keyof SystemPrompts, value: string) => void;
  handleSaveGlobalPrompt?: (key: keyof SystemPrompts, value: string) => void;
  handleResetSinglePrompt: (key: keyof SystemPrompts) => void;
  getCasePayload: (key: keyof SystemTemplates) => string;
  getPayloadTemplate: (key: keyof SystemTemplates) => string;
  handleResetSinglePayloadTemplate: (key: keyof SystemTemplates) => void;
  runAiPassagemPlantao: () => void;
  runAiPassometro: () => void;
  runAiEncaminhamento?: () => void;
  aiLoading: Record<string, boolean>;
}

export const DocumentosView: React.FC<DocumentosViewProps> = ({
  documents,
  setDocuments,
  compileAllDocuments,
  compileSingleDocument,
  templates,
  prompts,
  patient,
  setPatient,
  aiResults,
  handleSaveTemplate,
  handleSaveGlobalTemplate,
  handleSavePrompt,
  handleSaveGlobalPrompt,
  handleResetSinglePrompt,
  getCasePayload,
  getPayloadTemplate,
  handleResetSinglePayloadTemplate,
  runAiPassagemPlantao,
  runAiPassometro,
  runAiEncaminhamento,
  aiLoading,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const [diasAtestado, setDiasAtestado] = useState<string>(() => {
    const raw = aiResults?.medicalLeaveDays || '';
    const m = String(raw).match(/\d+/);
    const n = m ? parseInt(m[0], 10) : 1;
    return n <= 9 ? `0${n}` : String(n);
  });
  const [incluirCid, setIncluirCid] = useState<boolean>(true);

  React.useEffect(() => {
    if (aiResults?.medicalLeaveDays) {
      const m = String(aiResults.medicalLeaveDays).match(/\d+/);
      if (m) {
        const n = parseInt(m[0], 10);
        setDiasAtestado(n <= 9 ? `0${n}` : String(n));
      }
    }
  }, [aiResults?.medicalLeaveDays]);

  const handleCompileAtestado = () => {
    const n = parseInt(diasAtestado, 10) || 1;
    const formatted = n <= 9 ? `0${n}` : String(n);
    compileSingleDocument('atestado', {
      DIAS: formatted,
      INCLUIR_CID: incluirCid ? 'true' : 'false'
    });
  };

  const handleCompileEncaminhamento = () => {
    compileSingleDocument('encaminhamento');
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 1800);
  };

  const handlePrint = (content: string, title: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: monospace, sans-serif; font-size: 13px; line-height: 1.6; padding: 24px; color: #111; }
            h1 { font-size: 16px; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
            pre { white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <pre>${content}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* PRONTUÁRIO */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              PRONTUÁRIO
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={compileAllDocuments}
              className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
              title="Compilar Todos os Documentos da Página"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => compileSingleDocument('prontuario')}
              className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
              title="Compilar Prontuário"
            >
              <FileText className="w-4 h-4" />
            </button>
            <TemplateEditorButton
              label="Prontuário"
              templateKey="prontuario"
              currentTemplate={templates.prontuario}
              onSaveTemplate={(t) => handleSaveTemplate('prontuario', t)}
              onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('prontuario', t) : undefined}
            />
            <button
              type="button"
              onClick={() => copyToClipboard(documents.prontuario, 'prontuario')}
              className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
              title="Copiar Prontuário Completo"
            >
              {copiedSection === 'prontuario' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => handlePrint(documents.prontuario, 'Prontuário de Atendimento')}
              className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
              title="Imprimir Prontuário"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        <UndoableTextarea
          value={documents.prontuario}
          onChange={(val) => setDocuments({ ...documents, prontuario: val })}
          rows={14}
          className="font-mono text-xs leading-relaxed"
        />
      </section>

      {/* RECEITAS: UNIDADE & DOMICILIAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PRESCRIÇÃO INTERNA */}
        <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              PRESCRIÇÃO INTERNA
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => compileSingleDocument('receitaInterna')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Compilar Prescrição Interna"
              >
                <FileText className="w-4 h-4" />
              </button>
              <TemplateEditorButton
                label="Receita Interna"
                templateKey="receitaInterna"
                currentTemplate={templates.receitaInterna}
                onSaveTemplate={(t) => handleSaveTemplate('receitaInterna', t)}
                onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('receitaInterna', t) : undefined}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(documents.receitaInterna, 'interna')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Copiar Prescrição da Unidade"
              >
                {copiedSection === 'interna' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handlePrint(documents.receitaInterna, 'Prescrição Unidade')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Imprimir Prescrição da Unidade"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <UndoableTextarea
            value={documents.receitaInterna}
            onChange={(val) => setDocuments({ ...documents, receitaInterna: val })}
            rows={8}
            className="font-mono text-xs leading-relaxed"
          />
        </section>

        {/* RECEITUÁRIO DOMICILIAR */}
        <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              RECEITUÁRIO DOMICILIAR
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => compileSingleDocument('receitaDomiciliar')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Compilar Receituário Domiciliar"
              >
                <FileText className="w-4 h-4" />
              </button>
              <TemplateEditorButton
                label="Receita Domiciliar"
                templateKey="receitaDomiciliar"
                currentTemplate={templates.receitaDomiciliar}
                onSaveTemplate={(t) => handleSaveTemplate('receitaDomiciliar', t)}
                onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('receitaDomiciliar', t) : undefined}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(documents.receitaDomiciliar, 'domiciliar')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Copiar Receita Domiciliar"
              >
                {copiedSection === 'domiciliar' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handlePrint(documents.receitaDomiciliar, 'Receituário Domiciliar')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Imprimir Receita Domiciliar"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <UndoableTextarea
            value={documents.receitaDomiciliar}
            onChange={(val) => setDocuments({ ...documents, receitaDomiciliar: val })}
            rows={8}
            className="font-mono text-xs leading-relaxed"
          />
        </section>
      </div>

      {/* ATESTADO MÉDICO & ENCAMINHAMENTO PSF */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ATESTADO MÉDICO */}
        <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              ATESTADO MÉDICO
            </h2>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Dias de afastamento */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-[#383838] px-2 py-1 rounded-lg text-xs">
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
                  className="w-10 text-center font-bold text-slate-800 dark:text-ice-100 bg-transparent focus:outline-none"
                />
              </div>

              {/* CPF do Paciente */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-[#383838] px-2 py-1 rounded-lg text-xs">
                <span className="text-slate-500 dark:text-neutral-400 font-medium">CPF:</span>
                <input
                  type="text"
                  value={patient?.cpf || ''}
                  onChange={(e) => setPatient && patient && setPatient({ ...patient, cpf: e.target.value })}
                  className="w-24 text-center text-xs text-slate-800 dark:text-ice-100 bg-transparent focus:outline-none"
                />
              </div>

              {/* Toggle com ou sem CID */}
              <button
                type="button"
                onClick={() => setIncluirCid(!incluirCid)}
                className={`h-8 px-2 rounded-lg text-xs font-medium border transition-colors shadow-2xs flex items-center gap-1 ${
                  incluirCid
                    ? 'bg-slate-900 text-white dark:bg-[#303030] dark:text-white border-slate-900 dark:border-[#484848]'
                    : 'bg-white dark:bg-[#202020] border-slate-200 dark:border-[#333] text-slate-600 dark:text-neutral-400 hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                }`}
                title={incluirCid ? 'Com CID-10 e Assinatura do paciente' : 'Sem CID-10'}
              >
                <span>{incluirCid ? 'Com CID' : 'Sem CID'}</span>
              </button>

              <button
                type="button"
                onClick={handleCompileAtestado}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Compilar Atestado Médico"
              >
                <FileText className="w-4 h-4" />
              </button>
              <TemplateEditorButton
                label="Atestado"
                templateKey="atestado"
                currentTemplate={templates.atestado || DEFAULT_ATESTADO_TEMPLATE}
                onSaveTemplate={(t) => handleSaveTemplate('atestado', t)}
                onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('atestado', t) : undefined}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(documents.atestado || '', 'atestado')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Copiar Atestado"
              >
                {copiedSection === 'atestado' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handlePrint(documents.atestado || '', 'Atestado Médico')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Imprimir Atestado"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <UndoableTextarea
            value={documents.atestado || ''}
            onChange={(val) => setDocuments({ ...documents, atestado: val })}
            rows={8}
            className="font-mono text-xs leading-relaxed"
          />
        </section>

        {/* ENCAMINHAMENTO PSF */}
        <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              ENCAMINHAMENTO PSF
            </h2>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCompileEncaminhamento}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Compilar Encaminhamento PSF"
              >
                <FileText className="w-4 h-4" />
              </button>
              <TemplateEditorButton
                label="Encaminhamento PSF"
                templateKey="encaminhamento"
                currentTemplate={templates.encaminhamento || DEFAULT_ENCAMINHAMENTO_TEMPLATE}
                onSaveTemplate={(t) => handleSaveTemplate('encaminhamento', t)}
                onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('encaminhamento', t) : undefined}
              />
              {runAiEncaminhamento && (
                <AIActionButton
                  label="Gerar Encaminhamento com IA"
                  onExecute={runAiEncaminhamento}
                  isLoading={!!aiLoading.encaminhamento}
                  promptKey="encaminhamento"
                  currentPrompt={prompts.encaminhamento || DEFAULT_ENCAMINHAMENTO_PROMPT}
                  onSavePrompt={(p) => handleSavePrompt('encaminhamento', p)}
                  onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('encaminhamento', p) : undefined}
                  onResetPrompt={() => handleResetSinglePrompt('encaminhamento')}
                  contextPayload={getCasePayload('payloadEncaminhamento')}
                  payloadTemplate={getPayloadTemplate('payloadEncaminhamento')}
                  onSavePayloadTemplate={(t) => handleSaveTemplate('payloadEncaminhamento', t)}
                  onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadEncaminhamento', t) : undefined}
                  onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadEncaminhamento')}
                />
              )}
              <button
                type="button"
                onClick={() => copyToClipboard(documents.encaminhamento || '', 'encaminhamento')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Copiar Encaminhamento PSF"
              >
                {copiedSection === 'encaminhamento' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handlePrint(documents.encaminhamento || '', 'Encaminhamento PSF')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Imprimir Encaminhamento PSF"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <UndoableTextarea
            value={documents.encaminhamento || ''}
            onChange={(val) => setDocuments({ ...documents, encaminhamento: val })}
            rows={8}
            className="font-mono text-xs leading-relaxed"
          />
        </section>
      </div>

      {/* PASSAGEM DE CASO & PASSÔMETRO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PASSAGEM DE CASO */}
        <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              PASSAGEM DE CASO
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => compileSingleDocument('passagemPlantao')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Compilar Passagem de Caso"
              >
                <FileText className="w-4 h-4" />
              </button>
              <TemplateEditorButton
                label="Passagem de Plantão"
                templateKey="passagemPlantao"
                currentTemplate={templates.passagemPlantao}
                onSaveTemplate={(t) => handleSaveTemplate('passagemPlantao', t)}
                onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('passagemPlantao', t) : undefined}
              />
              <AIActionButton
                label="Sintetizar Caso para Passagem"
                onExecute={runAiPassagemPlantao}
                isLoading={!!aiLoading.passagem}
                promptKey="passagemPlantao"
                currentPrompt={prompts.passagemPlantao}
                onSavePrompt={(p) => handleSavePrompt('passagemPlantao', p)}
                onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('passagemPlantao', p) : undefined}
                onResetPrompt={() => handleResetSinglePrompt('passagemPlantao')}
                contextPayload={getCasePayload('payloadPassagemPlantao')}
                payloadTemplate={getPayloadTemplate('payloadPassagemPlantao')}
                onSavePayloadTemplate={(t) => handleSaveTemplate('payloadPassagemPlantao', t)}
                onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadPassagemPlantao', t) : undefined}
                onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadPassagemPlantao')}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(documents.passagemPlantao, 'passagem')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Copiar Passagem Oral"
              >
                {copiedSection === 'passagem' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <UndoableTextarea
            value={documents.passagemPlantao}
            onChange={(val) => setDocuments({ ...documents, passagemPlantao: val })}
            rows={7}
            className="font-mono text-xs leading-relaxed"
          />
        </section>

        {/* PASSÔMETRO */}
        <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              PASSÔMETRO
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => compileSingleDocument('passometro')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Compilar Passômetro"
              >
                <FileText className="w-4 h-4" />
              </button>
              <TemplateEditorButton
                label="Passômetro"
                templateKey="passometro"
                currentTemplate={
                  templates.passometro && templates.passometro.includes('PACIENTE:') && !templates.passometro.includes('[PASSÔMETRO]') && !templates.passometro.includes('LEITO / PACIENTE')
                    ? templates.passometro
                    : DEFAULT_PASSOMETRO_TEMPLATE
                }
                onSaveTemplate={(t) => handleSaveTemplate('passometro', t)}
                onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('passometro', t) : undefined}
              />
              <AIActionButton
                label="Gerar Passômetro com IA"
                onExecute={runAiPassometro}
                isLoading={!!aiLoading.passometro}
                promptKey="passometro"
                currentPrompt={
                  prompts.passometro && !prompts.passometro.includes('Identificação e Leito') && prompts.passometro.includes('PACIENTE:')
                    ? prompts.passometro
                    : DEFAULT_PROMPTS.passometro
                }
                onSavePrompt={(p) => handleSavePrompt('passometro', p)}
                onSaveGlobalPrompt={handleSaveGlobalPrompt ? (p) => handleSaveGlobalPrompt('passometro', p) : undefined}
                onResetPrompt={() => handleResetSinglePrompt('passometro')}
                contextPayload={getCasePayload('payloadPassometro')}
                payloadTemplate={getPayloadTemplate('payloadPassometro')}
                onSavePayloadTemplate={(t) => handleSaveTemplate('payloadPassometro', t)}
                onSaveGlobalPayloadTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('payloadPassometro', t) : undefined}
                onResetPayloadTemplate={() => handleResetSinglePayloadTemplate('payloadPassometro')}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(documents.passometro, 'passometro')}
                className="h-8 px-2.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors shadow-2xs flex items-center justify-center"
                title="Copiar Passômetro"
              >
                {copiedSection === 'passometro' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <UndoableTextarea
            value={documents.passometro}
            onChange={(val) => setDocuments({ ...documents, passometro: val })}
            rows={7}
            className="font-mono text-xs leading-relaxed"
          />
        </section>
      </div>
    </div>
  );
};
