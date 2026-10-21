import type { SystemTemplates, FinalDocuments } from '../types';
import { replaceTemplateTags, type TagContextData } from './templateTags';

export type CompilableDocType =
  | 'prontuario'
  | 'receitaInterna'
  | 'receitaDomiciliar'
  | 'passagemPlantao'
  | 'passometro'
  | 'atestado'
  | 'encaminhamento';

export const DEFAULT_ATESTADO_TEMPLATE = `ATESTADO MÉDICO

Atesto, para os devidos fins, que {{NOME}}, {{PORTADOR_CPF}}, {{ATENDIDO_UNIDADE}} nesta unidade no dia {{DATA}}, necessitando de {{DIAS_EXTENSO}} ({{DIAS}}) {{DIA_OU_DIAS}} de repouso e afastamento de suas atividades laborais e/ou escolares a contar desta data.
{{BLOCO_CID}}
Mateus Leme - MG, {{DATA_EXTENSO}}.`;

export const DEFAULT_ENCAMINHAMENTO_TEMPLATE = `ENCAMINHAMENTO MÉDICO — PSF / ATENÇÃO BÁSICA
Paciente: {{NOME}} | Idade: {{IDADE}} anos | Data: {{DATA}}
———————————————————————————————————

{{TEXTO_ENCAMINHAMENTO}}

———————————————————————————————————
Mateus Leme - MG, {{DATA_EXTENSO}}.`;

export const DEFAULT_PASSOMETRO_TEMPLATE = `PACIENTE: {{NOME}}
IDADE: {{IDADE}} anos
ADMISSÃO:: {{ADMISSAO}}
MÉDICO RESPONSÁVEL: Dr.
LOCAL DO PACIENTE:: SALA DE MEDICAÇÃO // ENFERMARIA // SALA VERMELHA
BREVE CONTEXTO: {{HMA_RESUMO}}

VÍCIOS: {{VICIOS}}
COMORBIDADES: {{COMORBIDADES}}
MEDICAÇÕES DE USO CONTÍNUO: {{MUC}}
ALERGIAS MEDICAMENTOSAS: {{ALERGIAS}}
EXAME FÍSICO ATUAL (somente dados relevantes ao caso): {{EXAME_RESUMO}}
HIPÓTESES DIAGNÓSTICAS: {{HIPOTESE}}

CONDUTAS:
{{CONDUTAS}}

PROPOSTAS: 
{{PROPOSTAS}}`;

/**
 * Monta o conteúdo de um documento médico específico aplicando as tags no template.
 */
export function buildDocument(
  docType: CompilableDocType,
  templates: SystemTemplates,
  contextData: TagContextData
): string {
  let template = templates[docType];
  if (!template || (docType === 'passometro' && (!template.includes('PACIENTE:') || template.includes('[PASSÔMETRO]') || template.includes('LEITO / PACIENTE')))) {
    if (docType === 'atestado') template = DEFAULT_ATESTADO_TEMPLATE;
    else if (docType === 'encaminhamento') template = DEFAULT_ENCAMINHAMENTO_TEMPLATE;
    else if (docType === 'passometro') template = DEFAULT_PASSOMETRO_TEMPLATE;
    else return '';
  }
  return replaceTemplateTags(template, contextData);
}

/**
 * Gera o texto da evolução médica com a lista formatada de medicações da unidade.
 */
export function generateEvolucaoText(
  templateEvolucao: string,
  contextData: TagContextData
): string {
  const rawMeds = contextData.aiResults.unitMedications || [];
  let medsUnidade = '';
  if (rawMeds.length > 0) {
    const fullText = rawMeds.join('\n\n').trim();
    if (fullText) {
      medsUnidade = fullText;
    }
  }
  if (!medsUnidade) {
    medsUnidade = 'Nenhuma medicação administrada registrada';
  }

  return replaceTemplateTags(templateEvolucao, {
    ...contextData,
    customReplacements: {
      ...contextData.customReplacements,
      MEDICACOES_UNIDADE: medsUnidade
    }
  });
}

/**
 * Compila todos os documentos clínicos de uma vez só a partir dos templates e dados do paciente.
 */
export function compileAllDocuments(
  templates: SystemTemplates,
  contextData: TagContextData
): Omit<FinalDocuments, 'evolucao'> {
  return {
    prontuario: buildDocument('prontuario', templates, contextData),
    receitaInterna: buildDocument('receitaInterna', templates, contextData),
    receitaDomiciliar: buildDocument('receitaDomiciliar', templates, contextData),
    passagemPlantao: buildDocument('passagemPlantao', templates, contextData),
    passometro: buildDocument('passometro', templates, contextData),
    atestado: buildDocument('atestado', templates, contextData),
    encaminhamento: buildDocument('encaminhamento', templates, contextData)
  };
}
