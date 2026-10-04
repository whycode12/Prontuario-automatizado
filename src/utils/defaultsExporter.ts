import type { SystemTemplates, SystemPrompts } from '../types';
import { parseHppText } from '../data/defaults';

export function generateDefaultsSourceCode(
  templates: SystemTemplates,
  prompts: SystemPrompts
): string {
  const sanitizeString = (str: string | undefined): string => {
    if (!str) return "''";
    // Escapar backticks e interpolações ${...} para literais de template em TypeScript
    const escaped = str
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');
    return `\`${escaped}\``;
  };

  // Extrai os valores padrão atuais a partir do template de HPP configurado
  const parsedDefaults = parseHppText(templates.hpp || '');

  return `import type { SystemTemplates, SystemPrompts, HppData } from '../types';

export function parseHppText(text: string): HppData {
  const result: HppData = {
    alergias: ${sanitizeString(parsedDefaults.alergias)},
    comorbidades: ${sanitizeString(parsedDefaults.comorbidades)},
    muc: ${sanitizeString(parsedDefaults.muc)},
    cirurgias: ${sanitizeString(parsedDefaults.cirurgias)},
    tabagismo: ${sanitizeString(parsedDefaults.tabagismo)},
    etilismo: ${sanitizeString(parsedDefaults.etilismo)}
  };
  if (!text || typeof text !== 'string') return result;

  const lines = text.split('\\n').map((l) => l.trim()).filter(Boolean);
  let matched = false;

  for (const line of lines) {
    if (/^alergia(s)?(\\s*medicamentosa(s)?)?(\\s*conhecida(s)?)?:/i.test(line)) {
      result.alergias = line.replace(/^[^:]+:\\s*/i, '').trim();
      matched = true;
    } else if (/^comorbidade(s)?:/i.test(line)) {
      result.comorbidades = line.replace(/^[^:]+:\\s*/i, '').trim();
      matched = true;
    } else if (/^muc(\\s*\\(.*\\))?:/i.test(line)) {
      result.muc = line.replace(/^[^:]+:\\s*/i, '').trim();
      matched = true;
    } else if (/^cirurgia(s)?(\\s+pr[eé]via(s)?)?:/i.test(line)) {
      result.cirurgias = line.replace(/^[^:]+:\\s*/i, '').trim();
      matched = true;
    } else if (/^tabagismo:/i.test(line)) {
      result.tabagismo = line.replace(/^[^:]+:\\s*/i, '').trim();
      matched = true;
    } else if (/^etilismo:/i.test(line)) {
      result.etilismo = line.replace(/^[^:]+:\\s*/i, '').trim();
      matched = true;
    }
  }

  if (!matched && lines.length > 0) {
    if (lines[0]) result.alergias = lines[0];
    if (lines[1]) result.comorbidades = lines[1];
    if (lines[2]) result.muc = lines[2];
    if (lines[3]) result.cirurgias = lines[3];
    if (lines[4]) result.tabagismo = lines[4];
    if (lines[5]) result.etilismo = lines[5];
  }

  return result;
}

export const DEFAULT_TEMPLATES: SystemTemplates = {
  hpp: ${sanitizeString(templates.hpp)},
  exameFisico: ${sanitizeString(templates.exameFisico)},
  prontuario: ${sanitizeString(templates.prontuario)},
  receitaInterna: ${sanitizeString(templates.receitaInterna)},
  receitaDomiciliar: ${sanitizeString(templates.receitaDomiciliar)},
  passagemPlantao: ${sanitizeString(templates.passagemPlantao)},
  passometro: ${sanitizeString(templates.passometro)},
  evolucao: ${sanitizeString(templates.evolucao)},
  payloadCaso: ${sanitizeString(templates.payloadCaso)}${[
    templates.payloadHma ? `,\n  payloadHma: ${sanitizeString(templates.payloadHma)}` : '',
    templates.payloadExameFisico ? `,\n  payloadExameFisico: ${sanitizeString(templates.payloadExameFisico)}` : '',
    templates.payloadDiagnostico ? `,\n  payloadDiagnostico: ${sanitizeString(templates.payloadDiagnostico)}` : '',
    templates.payloadConduta ? `,\n  payloadConduta: ${sanitizeString(templates.payloadConduta)}` : '',
    templates.payloadOrientacoes ? `,\n  payloadOrientacoes: ${sanitizeString(templates.payloadOrientacoes)}` : '',
    templates.payloadPassagemPlantao ? `,\n  payloadPassagemPlantao: ${sanitizeString(templates.payloadPassagemPlantao)}` : '',
    templates.payloadPassometro ? `,\n  payloadPassometro: ${sanitizeString(templates.payloadPassometro)}` : '',
    templates.payloadReavaliacao ? `,\n  payloadReavaliacao: ${sanitizeString(templates.payloadReavaliacao)}` : '',
    templates.payloadConclusaoObs ? `,\n  payloadConclusaoObs: ${sanitizeString(templates.payloadConclusaoObs)}` : ''
  ].join('')}
};

export const DEFAULT_PROMPTS: SystemPrompts = {
  hma: ${sanitizeString(prompts.hma)},
  exameFisico: ${sanitizeString(prompts.exameFisico)},
  diagnostico: ${sanitizeString(prompts.diagnostico)},
  conduta: ${sanitizeString(prompts.conduta)},
  melhorarCondutas: ${sanitizeString(prompts.melhorarCondutas || '')},
  orientacoes: ${sanitizeString(prompts.orientacoes)},
  passagemPlantao: ${sanitizeString(prompts.passagemPlantao)},
  passometro: ${sanitizeString(prompts.passometro)},
  reavaliacao: ${sanitizeString(prompts.reavaliacao)},
  conclusaoObs: ${sanitizeString(prompts.conclusaoObs)}
};
`;
}

export function downloadDefaultsFile(templates: SystemTemplates, prompts: SystemPrompts): void {
  const code = generateDefaultsSourceCode(templates, prompts);
  const blob = new Blob([code], { type: 'text/typescript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'defaults.ts';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyDefaultsCodeToClipboard(
  templates: SystemTemplates,
  prompts: SystemPrompts
): Promise<void> {
  const code = generateDefaultsSourceCode(templates, prompts);
  await navigator.clipboard.writeText(code);
}
