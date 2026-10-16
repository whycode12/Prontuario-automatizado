import type { SystemTemplates, FinalDocuments } from '../types';
import { replaceTemplateTags, type TagContextData } from './templateTags';

export type CompilableDocType = 'prontuario' | 'receitaInterna' | 'receitaDomiciliar' | 'passagemPlantao' | 'passometro';

/**
 * Monta o conteúdo de um documento médico específico aplicando as tags no template.
 */
export function buildDocument(
  docType: CompilableDocType,
  templates: SystemTemplates,
  contextData: TagContextData
): string {
  const template = templates[docType];
  if (!template) return '';
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
 * Compila todos os 5 documentos clínicos de uma vez só a partir dos templates e dados do paciente.
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
    passometro: buildDocument('passometro', templates, contextData)
  };
}
