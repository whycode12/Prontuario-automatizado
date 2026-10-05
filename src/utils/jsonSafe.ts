/**
 * Parser resiliente para extrair e interpretar saídas JSON geradas por modelos de IA.
 * Trata blocos de markdown (```json ... ```), texto conversacional adicional,
 * quebras de linha e vírgulas finais (trailing commas).
 */
export function safeJsonParse<T = any>(raw: string, fallback?: T): T {
  if (!raw || typeof raw !== 'string') {
    if (fallback !== undefined) return fallback;
    throw new Error('Conteúdo vazio para parsing JSON.');
  }

  // 1. Limpeza inicial de blocos markdown
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 2. Tentativa direta de parsing
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continua para extração mais avançada
  }

  // 3. Extração do bloco JSON mais externo ({...} ou [...])
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1).trim();

    // Tentativa pós-recorte
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // Tentar remover trailing commas antes de } ou ]
      const sanitized = cleaned
        .replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(sanitized) as T;
      } catch (err: any) {
        if (fallback !== undefined) return fallback;
        throw new Error(`Falha ao converter resposta da IA em formato estruturado: ${err.message}`);
      }
    }
  }

  if (fallback !== undefined) return fallback;
  throw new Error('A resposta da IA não continha uma estrutura JSON válida.');
}
