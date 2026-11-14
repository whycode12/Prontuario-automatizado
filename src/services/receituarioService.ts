import type { BancoReceitasJSON, PrescricaoOption } from '../types/receituario';

let db: BancoReceitasJSON | null = null;
let loadPromise: Promise<BancoReceitasJSON> | null = null;

export async function ensureReceituarioDb(): Promise<BancoReceitasJSON> {
  if (db) return db;
  if (!loadPromise) {
    loadPromise = import('../data/banco_receitas.json').then((mod) => {
      db = mod.default as unknown as BancoReceitasJSON;
      return db;
    });
  }
  return loadPromise;
}

export function isReceituarioLoaded(): boolean {
  return db !== null;
}

function normalize(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function parseAndRoundPeso(pesoStr?: string | null): number | null {
  if (!pesoStr) return null;
  const cleaned = pesoStr.trim().replace(',', '.').replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num);
}

function detectFormType(presentation?: string | null, posology?: string | null): string {
  const text = `${presentation || ''} ${posology || ''}`.toLowerCase();
  if (/\bgotas?\b/i.test(text)) return 'Gotas';
  if (/\bsuspens/i.test(text)) return 'Suspensão';
  if (/\bcomprimid/i.test(text)) return 'Comprimido';
  if (/\bc[aá]psul/i.test(text)) return 'Cápsula';
  if (/\bxarope/i.test(text)) return 'Xarope';
  if (/\bsolu[cç][aã]o\b/i.test(text)) return 'Solução';
  if (/\b(creme|pomada|gel|t[oó]pic)/i.test(text)) return 'Tópico';
  if (/\b(spray|aerossol|inalat)/i.test(text)) return 'Inalatório';
  if (/\b(ampola|injet[aá]vel)/i.test(text)) return 'Injetável';
  return 'Adulto';
}

const ROUTE_HEADER_REGEX =
  /^[ \t]*(USO\s+(?:ORAL|INTRAMUSCULAR|ENDOVENOSO|INTRAVENOSO|SUBCUT[AÁÂ]NEO|SUBLINGUAL|T[OÓ]PICO|INALAT[OÓ]RIO|OFT[AÁ]LMICO|OTOL[OÓ]GICO|NASAL|RETAL|VAGINAL|DERMATOL[OÓ]GICO|OCULAR|PARENTERAL|INJET[AÁ]VEL))\s*:?/gim;

export function normalizeRouteHeader(route?: string | null): string {
  if (!route) return 'USO ORAL:';
  const rUpper = route.trim().toUpperCase();

  const mapping: Record<string, string> = {
    VO: 'USO ORAL:',
    IM: 'USO INTRAMUSCULAR:',
    EV: 'USO ENDOVENOSO:',
    IV: 'USO ENDOVENOSO:',
    SC: 'USO SUBCUTÂNEO:',
    TOP: 'USO TÓPICO:',
    VI: 'USO INALATÓRIO:',
    VR: 'USO RETAL:',
    NASAL: 'USO NASAL:',
    TÓPICO: 'USO TÓPICO:',
    TOPICO: 'USO TÓPICO:',
    ORAL: 'USO ORAL:',
    INALATÓRIO: 'USO INALATÓRIO:',
    INALATORIO: 'USO INALATÓRIO:',
    OFTÁLMICO: 'USO OFTÁLMICO:',
    OFTALMICO: 'USO OFTÁLMICO:',
    OTOLÓGICO: 'USO OTOLÓGICO:',
    OTOLOGICO: 'USO OTOLÓGICO:',
    RETAL: 'USO RETAL:',
    VAGINAL: 'USO VAGINAL:',
    SUBLINGUAL: 'USO SUBLINGUAL:',
    INJETÁVEL: 'USO INJETÁVEL:',
    INJETAVEL: 'USO INJETÁVEL:'
  };

  if (mapping[rUpper]) return mapping[rUpper];

  if (/^USO\s+/i.test(rUpper)) {
    let clean = rUpper.replace(/[:\s]+$/, '');
    clean = clean.replace(/\bTOPICO\b/, 'TÓPICO');
    clean = clean.replace(/\bINALATORIO\b/, 'INALATÓRIO');
    clean = clean.replace(/\bOFTALMICO\b/, 'OFTÁLMICO');
    clean = clean.replace(/\bOTOLOGICO\b/, 'OTOLÓGICO');
    clean = clean.replace(/\bSUBCUTANEO\b/, 'SUBCUTÂNEO');
    clean = clean.replace(/\bINJETAVEL\b/, 'INJETÁVEL');
    return clean + ':';
  }

  return `USO ${rUpper}:`;
}

function splitItems(sectionBody: string): string[] {
  const body = sectionBody.trim();
  if (!body) return [];

  const itemRegex = /^[ \t]*(\d+)\.[ \t]+/gm;
  const matches = [...body.matchAll(itemRegex)];

  if (matches.length > 0) {
    const items: string[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index!;
      const end = i + 1 < matches.length ? matches[i + 1].index! : body.length;
      const text = body.slice(start, end).trim();
      const clean = text.replace(/^[ \t]*\d+\.[ \t]*/, '').trim();
      if (clean) items.push(clean);
    }
    return items;
  }

  return body
    .split(/\n{2,}/)
    .map((b) => b.replace(/^[ \t]*\d+\.[ \t]*/, '').trim())
    .filter(Boolean);
}

function formatSection(header: string, items: string[]): string {
  if (items.length === 0) return '';
  const lines: string[] = [header, ''];
  for (let i = 0; i < items.length; i++) {
    const cleanItem = items[i].replace(/^[ \t]*\d+\.[ \t]*/, '').trim();
    lines.push(`${i + 1}. ${cleanItem}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function appendMedicationToPrescription(
  currentText: string,
  newMedText: string,
  route?: string | null
): string {
  const routeHeader = normalizeRouteHeader(route);
  const cleanMed = newMedText.trim().replace(/^[ \t]*\d+\.[ \t]*/, '').trim();
  if (!cleanMed) return currentText;

  const text = (currentText || '').trim();
  if (!text) {
    return `${routeHeader}\n\n1. ${cleanMed}`;
  }

  const matches = [...text.matchAll(ROUTE_HEADER_REGEX)];
  if (matches.length === 0) {
    return `${text}\n\n${routeHeader}\n\n1. ${cleanMed}`;
  }

  const sections: { header: string; items: string[] }[] = [];
  let headerBefore: string | null = null;

  if (matches[0].index! > 0) {
    const pre = text.slice(0, matches[0].index!).trim();
    if (pre) headerBefore = pre;
  }

  let foundTarget = false;

  for (let i = 0; i < matches.length; i++) {
    const hdr = normalizeRouteHeader(matches[i][1]);
    const startPos = matches[i].index! + matches[i][0].length;
    const endPos = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const sectionBody = text.slice(startPos, endPos).trim();
    const items = splitItems(sectionBody);

    if (hdr.toUpperCase() === routeHeader.toUpperCase()) {
      items.push(cleanMed);
      foundTarget = true;
    }

    sections.push({ header: hdr, items });
  }

  if (!foundTarget) {
    sections.push({ header: routeHeader, items: [cleanMed] });
  }

  const resultParts: string[] = [];
  if (headerBefore) resultParts.push(headerBefore);

  for (const sec of sections) {
    const secText = formatSection(sec.header, sec.items);
    if (secText) resultParts.push(secText);
  }

  return resultParts.join('\n\n');
}

export function searchPrescricaoInterna(query: string): PrescricaoOption[] {
  if (!db) return [];
  const q = normalize(query);
  const meds = db.medicamentos || [];

  const matchedMeds = meds.filter((m) => {
    const hasInterna = m.vias_administracao?.some(
      (v) => v.source === 'remedios_prescricao_interna'
    );
    if (!hasInterna) return false;
    if (!q) return true;
    const n = normalize(m.nome);
    const nb = normalize(m.nome_busca);
    const cat = normalize(m.categoria);
    return n.includes(q) || nb.includes(q) || cat.includes(q);
  });

  const results: PrescricaoOption[] = [];

  for (const med of matchedMeds) {
    const internals = (med.vias_administracao || []).filter(
      (v) => v.source === 'remedios_prescricao_interna'
    );

    for (let i = 0; i < internals.length; i++) {
      const v = internals[i];
      const lines = (v.text || '').trim().split('\n').filter(Boolean);
      const firstLine = lines[0] || med.nome;
      const secondLine = lines.slice(1).join(' ') || '';

      results.push({
        id: `${med.id}-interna-${v.adm}-${i}`,
        label: firstLine,
        badge: v.adm || 'INTERNA',
        subtitle: secondLine || capitalize(med.categoria),
        fullText: v.text.trim(),
        route: v.adm || 'VO'
      });
    }

    if (results.length >= 25) break;
  }

  return results;
}

export function searchPrescricaoDomiciliar(
  query: string,
  pesoStr?: string | null
): PrescricaoOption[] {
  if (!db) return [];
  const q = normalize(query);
  const peso = parseAndRoundPeso(pesoStr);
  const meds = db.medicamentos || [];

  const matchedMeds = q
    ? meds.filter((m) => {
        const n = normalize(m.nome);
        const nb = normalize(m.nome_busca);
        const cat = normalize(m.categoria);
        return n.includes(q) || nb.includes(q) || cat.includes(q);
      })
    : meds.slice(0, 15);

  const results: PrescricaoOption[] = [];

  for (const med of matchedMeds) {
    const hasAdulto = Boolean(med.tem_adulto && med.receita_adulto);
    const hasPed = Boolean(med.tem_pediatrico && med.receita_pediatrica?.tem_pediatrico);
    const defaultRoute = med.via_administracao_padrao || 'USO ORAL';

    let pedText = '';
    let pedApres = med.receita_pediatrica?.apresentacao_padrao || '';
    let pedPosologia = med.receita_pediatrica?.posologia_padrao || '';
    let pedForm = detectFormType(pedApres, pedPosologia);
    if (pedForm === 'Adulto') pedForm = 'Pediátrico';
    let pedBadge = pedForm;

    if (hasPed && med.receita_pediatrica) {
      if (peso !== null) {
        const key = String(peso);
        const dosePorPeso = med.receita_pediatrica.doses_por_peso?.[key];

        if (dosePorPeso) {
          pedText = dosePorPeso.texto_completo || '';
          pedApres = dosePorPeso.apresentacao || pedApres;
          pedPosologia = dosePorPeso.posologia || pedPosologia;
          pedBadge = `${pedForm} (${peso} kg)`;
        } else if (peso >= 40) {
          const dose39 = med.receita_pediatrica.doses_por_peso?.['39'];
          pedText = dose39?.texto_completo || med.receita_pediatrica.texto_padrao || '';
          pedBadge = `${pedForm} (≥40 kg)`;
        } else if (
          med.receita_pediatrica.peso_min_kg &&
          peso < med.receita_pediatrica.peso_min_kg
        ) {
          const minK = String(med.receita_pediatrica.peso_min_kg);
          const minDose = med.receita_pediatrica.doses_por_peso?.[minK];
          pedText = minDose?.texto_completo || med.receita_pediatrica.texto_padrao || '';
          pedBadge = `${pedForm} (${minK} kg mín.)`;
        } else {
          pedText = med.receita_pediatrica.texto_padrao || '';
          pedBadge = `${pedForm} (${peso} kg)`;
        }
      } else {
        pedText = med.receita_pediatrica.texto_padrao || '';
        pedBadge = `${pedForm} / Pediátrico`;
      }
    }

    if (hasAdulto && hasPed && med.receita_adulto) {
      const adultBadge = detectFormType(
        med.receita_adulto.apresentacao,
        med.receita_adulto.posologia
      );

      results.push({
        id: `${med.id}-dom-adulto`,
        label: med.receita_adulto.apresentacao || capitalize(med.nome),
        badge: adultBadge,
        subtitle: med.receita_adulto.posologia || '',
        fullText: med.receita_adulto.texto_completo.trim(),
        route: defaultRoute
      });

      if (pedText) {
        results.push({
          id: `${med.id}-dom-ped`,
          label: pedApres || `${capitalize(med.nome)} (Pediátrico)`,
          badge: pedBadge,
          subtitle: pedPosologia,
          fullText: pedText.trim(),
          route: defaultRoute
        });
      }
    } else if (hasAdulto && med.receita_adulto) {
      results.push({
        id: `${med.id}-dom-adulto`,
        label: med.receita_adulto.apresentacao || capitalize(med.nome),
        badge: detectFormType(
          med.receita_adulto.apresentacao,
          med.receita_adulto.posologia
        ),
        subtitle: med.receita_adulto.posologia || '',
        fullText: med.receita_adulto.texto_completo.trim(),
        route: defaultRoute
      });
    } else if (hasPed && pedText) {
      results.push({
        id: `${med.id}-dom-ped`,
        label: pedApres || capitalize(med.nome),
        badge: pedBadge,
        subtitle: pedPosologia,
        fullText: pedText.trim(),
        route: defaultRoute
      });
    }

    if (results.length >= 25) break;
  }

  return results;
}
