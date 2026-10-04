import React, { useState } from 'react';
import {
  Copy,
  Printer,
  Check,
  Layers,
  FileText,
} from 'lucide-react';
import type { FinalDocuments, SystemTemplates, SystemPrompts } from '../types';
import { UndoableTextarea } from '../components/UndoableTextarea';
import { AIActionButton } from '../components/AIActionButton';
import { TemplateEditorButton } from '../components/TemplateEditorButton';

interface DocumentosViewProps {
  documents: FinalDocuments;
  setDocuments: React.Dispatch<React.SetStateAction<FinalDocuments>>;
  compileAllDocuments: () => void;
  compileSingleDocument: (docType: 'prontuario' | 'receitaInterna' | 'receitaDomiciliar' | 'passagemPlantao' | 'passometro') => void;
  templates: SystemTemplates;
  prompts: SystemPrompts;
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
  aiLoading: Record<string, boolean>;
}

export const DocumentosView: React.FC<DocumentosViewProps> = ({
  documents,
  setDocuments,
  compileAllDocuments,
  compileSingleDocument,
  templates,
  prompts,
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
  aiLoading,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

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
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
              title="Compilar Todos os Documentos da Página"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => compileSingleDocument('prontuario')}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
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
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
              title="Copiar Prontuário Completo"
            >
              {copiedSection === 'prontuario' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => handlePrint(documents.prontuario, 'Prontuário de Atendimento')}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
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
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
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
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
                title="Copiar Prescrição da Unidade"
              >
                {copiedSection === 'interna' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handlePrint(documents.receitaInterna, 'Prescrição Unidade')}
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
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
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
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
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
                title="Copiar Receita Domiciliar"
              >
                {copiedSection === 'domiciliar' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handlePrint(documents.receitaDomiciliar, 'Receituário Domiciliar')}
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
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
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
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
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
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
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
                title="Compilar Passômetro"
              >
                <FileText className="w-4 h-4" />
              </button>
              <TemplateEditorButton
                label="Passômetro"
                templateKey="passometro"
                currentTemplate={templates.passometro}
                onSaveTemplate={(t) => handleSaveTemplate('passometro', t)}
                onSaveGlobalTemplate={handleSaveGlobalTemplate ? (t) => handleSaveGlobalTemplate('passometro', t) : undefined}
              />
              <AIActionButton
                label="Gerar Passômetro com IA"
                onExecute={runAiPassometro}
                isLoading={!!aiLoading.passometro}
                promptKey="passometro"
                currentPrompt={prompts.passometro}
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
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-slate-200 dark:border-[#383838] hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors"
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
