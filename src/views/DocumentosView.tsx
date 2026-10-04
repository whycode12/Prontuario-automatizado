import React, { useState } from 'react';
import {
  Copy,
  Printer,
  Sparkles,
  Check,
} from 'lucide-react';
import type { FinalDocuments, SystemTemplates, SystemPrompts } from '../types';
import { UndoableTextarea } from '../components/UndoableTextarea';
import { AIActionButton } from '../components/AIActionButton';
import { TemplateEditorButton } from '../components/TemplateEditorButton';

interface DocumentosViewProps {
  documents: FinalDocuments;
  setDocuments: React.Dispatch<React.SetStateAction<FinalDocuments>>;
  compileAllDocuments: () => void;
  templates: SystemTemplates;
  prompts: SystemPrompts;
  handleSaveTemplate: (key: keyof SystemTemplates, value: string) => void;
  handleSavePrompt: (key: keyof SystemPrompts, value: string) => void;
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
  templates,
  prompts,
  handleSaveTemplate,
  handleSavePrompt,
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
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-navy-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-ice-100 uppercase tracking-wide">
            Prontuário & Documentos Finais
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Documentos consolidados prontos para cópia rápida no sistema de prontuário eletrônico ou impressão.
          </p>
        </div>

        <button
          type="button"
          onClick={compileAllDocuments}
          className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>Compilar Todos os Documentos</span>
        </button>
      </div>

      {/* 1. PRONTUÁRIO CLÍNICO COMPLETO */}
      <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              1. Prontuário Completo de Atendimento
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <TemplateEditorButton
              label="Prontuário"
              templateKey="prontuario"
              currentTemplate={templates.prontuario}
              onSaveTemplate={(t) => handleSaveTemplate('prontuario', t)}
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
          placeholder="Clique em 'Compilar Todos os Documentos' para preencher automaticamente com os dados do atendimento..."
          className="font-mono text-xs leading-relaxed"
        />
      </section>

      {/* 2. RECEITAS: UNIDADE & DOMICILIAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Receita Unidade */}
        <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              2. Prescrição Unidade (PA)
            </h2>

            <div className="flex items-center gap-2">
              <TemplateEditorButton
                label="Receita Interna"
                templateKey="receitaInterna"
                currentTemplate={templates.receitaInterna}
                onSaveTemplate={(t) => handleSaveTemplate('receitaInterna', t)}
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
            placeholder="Medicações prescritas para administração na unidade e exames solicitados..."
            className="font-mono text-xs leading-relaxed"
          />
        </section>

        {/* Receita Domiciliar */}
        <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              3. Receituário Domiciliar
            </h2>

            <div className="flex items-center gap-2">
              <TemplateEditorButton
                label="Receita Domiciliar"
                templateKey="receitaDomiciliar"
                currentTemplate={templates.receitaDomiciliar}
                onSaveTemplate={(t) => handleSaveTemplate('receitaDomiciliar', t)}
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
            placeholder="Receituário externo, posologia e sinais de alarme em linguagem leiga..."
            className="font-mono text-xs leading-relaxed"
          />
        </section>
      </div>

      {/* 3. PASSAGEM DE PLANTÃO & PASSÔMETRO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Passagem de Plantão Oral */}
        <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              4. Passagem de Plantão Verbal
            </h2>

            <div className="flex items-center gap-2">
              <TemplateEditorButton
                label="Passagem de Plantão"
                templateKey="passagemPlantao"
                currentTemplate={templates.passagemPlantao}
                onSaveTemplate={(t) => handleSaveTemplate('passagemPlantao', t)}
              />
              <AIActionButton
                label="Sintetizar Caso para Passagem"
                onExecute={runAiPassagemPlantao}
                isLoading={!!aiLoading.passagem}
                promptKey="passagemPlantao"
                currentPrompt={prompts.passagemPlantao}
                onSavePrompt={(p) => handleSavePrompt('passagemPlantao', p)}
                onResetPrompt={() => handleResetSinglePrompt('passagemPlantao')}
                contextPayload={getCasePayload('payloadPassagemPlantao')}
                payloadTemplate={getPayloadTemplate('payloadPassagemPlantao')}
                onSavePayloadTemplate={(t) => handleSaveTemplate('payloadPassagemPlantao', t)}
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
            placeholder="Passagem verbal concisa para passagem de turno e troca de plantão..."
            className="font-mono text-xs leading-relaxed"
          />
        </section>

        {/* Passômetro Estruturado */}
        <section className="bg-white dark:bg-navy-850 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
              5. Passômetro Estruturado
            </h2>

            <div className="flex items-center gap-2">
              <TemplateEditorButton
                label="Passômetro"
                templateKey="passometro"
                currentTemplate={templates.passometro}
                onSaveTemplate={(t) => handleSaveTemplate('passometro', t)}
              />
              <AIActionButton
                label="Gerar Passômetro com IA"
                onExecute={runAiPassometro}
                isLoading={!!aiLoading.passometro}
                promptKey="passometro"
                currentPrompt={prompts.passometro}
                onSavePrompt={(p) => handleSavePrompt('passometro', p)}
                onResetPrompt={() => handleResetSinglePrompt('passometro')}
                contextPayload={getCasePayload('payloadPassometro')}
                payloadTemplate={getPayloadTemplate('payloadPassometro')}
                onSavePayloadTemplate={(t) => handleSaveTemplate('payloadPassometro', t)}
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
            placeholder="Estrutura de passômetro (Leito, HD, Condutas Feitas, Pendências Ativas, Sinais de Alerta)..."
            className="font-mono text-xs leading-relaxed"
          />
        </section>
      </div>
    </div>
  );
};
