import type { BancoReceitasJSON, PrescricaoOption, Medicamento } from '../types/receituario';

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

export function cleanCommercialName(text?: string | null): string {
  return (text || '')
    .replace(/\s*\([^)]*®[^)]*\)/gi, '')
    .replace(/\s*\.[ \t.]+/g, ' ')
    .trim();
}

export function formatMedicationHeader(apres?: string | null, qtd?: string | null, targetCol = 65): string {
  const cleanApres = cleanCommercialName(apres);
  const cleanQtd = (qtd || '').trim();
  if (!cleanQtd) return cleanApres;
  const needed = targetCol - cleanApres.length - cleanQtd.length - 2;
  const numDashes = needed > 5 ? needed : 6;
  return cleanApres + ' ' + '—'.repeat(numDashes) + ' ' + cleanQtd;
}

export function transformPosologia(pos: string, route?: string | null): string {
  let p = (pos || '').trim();
  if (!p) return '';
  const isOral = !route || route.toUpperCase().includes('ORAL') || /^(tomar|ingerir|mastigar)\b/i.test(p);

  if (isOral && !/\bvia oral\b/i.test(p)) {
    p = p.replace(/^(tomar|ingerir|mastigar)\s+([^,]+),\s*/i, (_m, verb, dose) => {
      return verb + ' ' + dose + ', via oral, ';
    });
  }

  const isConditional = /\b(se\s+(dor|febre|n[aá]usea|v[oó]mito|c[oó]lica|azia|tosse|sintom|piora|crise)|at[eé]\s+(?:de|em))\b/i.test(p);

  p = p.replace(/\bat[eé]\s+(?:de|em)\s+(\d+)\s*[\/\-]\s*(\d+)\s*(?:horas?|h)\b/gi, (_m, h1, h2) => {
    return 'podendo repetir de ' + h1 + ' em ' + h2 + ' horas';
  });

  p = p.replace(/(?:\bde\s+)?(\d+)\s*[\/\-]\s*(\d+)\s*(?:horas?|h)\b/gi, (_m, h1, h2) => {
    if (isConditional) {
      return 'podendo repetir de ' + h1 + ' em ' + h2 + ' horas';
    }
    return 'de ' + h1 + ' em ' + h2 + ' horas';
  });

  if (isConditional) {
    p = p.replace(/\bpor\s+(\d+)\s*dias\b/gi, (_m, d) => 'por até ' + d + ' dias');
    p = p.replace(/\bpor\s+at[eé]\s+at[eé]\s+/gi, 'por até ');
  }

  return p;
}

export function formatReceitaItemText(fullText?: string | null, route?: string | null, targetCol = 65): string {
  if (!fullText) return '';
  const lines = fullText.split('\n');
  const firstLine = lines[0] || '';
  const restLines = lines.slice(1);

  const dotMatch = firstLine.match(/^(.*?)(?:[ \t]*\.[ \t.]+|[ \t]*—+[ \t]*)(.*?)$/);
  let apres = firstLine;
  let qtd = '';
  if (dotMatch) {
    apres = dotMatch[1].trim();
    qtd = dotMatch[2].trim();
  }

  const formattedHeader = formatMedicationHeader(apres, qtd, targetCol);
  const formattedPos = restLines.map((l) => transformPosologia(l, route)).join('\n');
  return formattedHeader + (formattedPos ? '\n' + formattedPos : '');
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
        label: cleanCommercialName(med.receita_adulto.apresentacao) || capitalize(med.nome),
        badge: adultBadge,
        subtitle: transformPosologia(med.receita_adulto.posologia || '', defaultRoute),
        fullText: formatReceitaItemText(med.receita_adulto.texto_completo.trim(), defaultRoute),
        route: defaultRoute
      });

      if (pedText) {
        results.push({
          id: `${med.id}-dom-ped`,
          label: cleanCommercialName(pedApres) || `${capitalize(med.nome)} (Pediátrico)`,
          badge: pedBadge,
          subtitle: transformPosologia(pedPosologia, defaultRoute),
          fullText: formatReceitaItemText(pedText.trim(), defaultRoute),
          route: defaultRoute
        });
      }
    } else if (hasAdulto && med.receita_adulto) {
      results.push({
        id: `${med.id}-dom-adulto`,
        label: cleanCommercialName(med.receita_adulto.apresentacao) || capitalize(med.nome),
        badge: detectFormType(
          med.receita_adulto.apresentacao,
          med.receita_adulto.posologia
        ),
        subtitle: transformPosologia(med.receita_adulto.posologia || '', defaultRoute),
        fullText: formatReceitaItemText(med.receita_adulto.texto_completo.trim(), defaultRoute),
        route: defaultRoute
      });
    } else if (hasPed && pedText) {
      results.push({
        id: `${med.id}-dom-ped`,
        label: cleanCommercialName(pedApres) || capitalize(med.nome),
        badge: pedBadge,
        subtitle: transformPosologia(pedPosologia, defaultRoute),
        fullText: formatReceitaItemText(pedText.trim(), defaultRoute),
        route: defaultRoute
      });
    }

    if (results.length >= 25) break;
  }

  return results;
}

export function findMedicationInDb(query: string): Medicamento | null {
  if (!db || !query) return null;
  const normInput = normalize(query);
  const cleanTokens = normInput
    .replace(/uso\s+(oral|intramuscular|endovenoso|topico|retal|inalatorio)/g, '')
    .replace(/\b(ev|im|vo|sc|vr|top|vi)\b/g, '')
    .replace(/\b\d+([,.]\d+)?\s*(mg|g|ml|mcg|ui|gotas|comprimidos|ampolas?)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(
      (t) =>
        t.length >= 3 &&
        ![
          'tomar',
          'administrar',
          'aplicar',
          'agora',
          'caixa',
          'comprimido',
          'ampola',
          'diluido',
          'lento',
          'bolsa',
          'frasco',
          'cada',
          'horas',
          'dias'
        ].includes(t)
    );

  if (cleanTokens.length === 0) return null;

  let bestMed: Medicamento | null = null;
  let bestScore = -1;

  for (const m of db.medicamentos) {
    const nomeNorm = normalize(m.nome);
    const buscaNorm = normalize(m.nome_busca || '');
    let matchedTokenCount = 0;
    let score = 0;

    for (const token of cleanTokens) {
      let matched = false;
      if (nomeNorm === token) {
        score += 10;
        matched = true;
      } else if (nomeNorm.split(/\s+/).includes(token)) {
        score += 8;
        matched = true;
      } else if (nomeNorm.includes(token)) {
        score += 4;
        matched = true;
      }

      if (buscaNorm.split(/\s+/).includes(token)) {
        score += 6;
        matched = true;
      } else if (buscaNorm.includes(token)) {
        score += 3;
        matched = true;
      }

      if (matched) matchedTokenCount++;
    }

    score += matchedTokenCount * 15;

    if (score > bestScore) {
      bestScore = score;
      bestMed = m;
    }
  }

  return bestScore >= 3 ? bestMed : null;
}

export function detectRouteFromText(text: string): string | null {
  const t = (text || '').toUpperCase();
  if (/\b(EV|IV|ENDOVENOS[OA]|INTRAVENOS[OA])\b/.test(t)) return 'EV';
  if (/\b(IM|INTRAMUSCULAR)\b/.test(t)) return 'IM';
  if (/\b(VO|ORAL)\b/.test(t)) return 'VO';
  if (/\b(SC|SUBCUTANE[OA]|SUBCUTÂNE[OA])\b/.test(t)) return 'SC';
  if (/\b(TOP|TOPIC[OA]|TÓPIC[OA])\b/.test(t)) return 'TOP';
  if (/\b(VI|INALATORI[OA]|INALATÓRI[OA])\b/.test(t)) return 'VI';
  if (/\b(VR|RETAL)\b/.test(t)) return 'VR';
  return null;
}

export function getStandardizedInternaMedication(
  med: Medicamento,
  desiredRoute?: string | null
): { text: string; adm: string } | null {
  const internals = (med.vias_administracao || []).filter(
    (v) => v.source === 'remedios_prescricao_interna'
  );
  if (internals.length === 0) return null;

  if (desiredRoute) {
    const rUpper = desiredRoute.toUpperCase().trim();
    const found = internals.find((v) => v.adm?.toUpperCase() === rUpper);
    if (found) return { text: found.text.trim(), adm: found.adm || 'VO' };
  }

  const im = internals.find((v) => v.adm?.toUpperCase() === 'IM');
  if (im) return { text: im.text.trim(), adm: im.adm || 'IM' };

  return { text: internals[0].text.trim(), adm: internals[0].adm || 'VO' };
}

export function getStandardizedDomiciliarMedication(
  med: Medicamento,
  pesoStr?: string | null
): { text: string; route: string } | null {
  const peso = parseAndRoundPeso(pesoStr);
  const route = med.via_administracao_padrao || 'USO ORAL';

  let rawResult: { text: string; route: string } | null = null;

  if (peso !== null && med.tem_pediatrico && med.receita_pediatrica?.tem_pediatrico) {
    const key = String(peso);
    const dosePorPeso = med.receita_pediatrica.doses_por_peso?.[key];
    if (dosePorPeso) {
      rawResult = { text: dosePorPeso.texto_completo.trim(), route };
    } else if (peso >= 40 && med.receita_pediatrica.doses_por_peso?.['39']) {
      rawResult = { text: med.receita_pediatrica.doses_por_peso['39'].texto_completo.trim(), route };
    } else if (med.receita_pediatrica.texto_padrao) {
      rawResult = { text: med.receita_pediatrica.texto_padrao.trim(), route };
    }
  } else if (med.tem_adulto && med.receita_adulto) {
    rawResult = { text: med.receita_adulto.texto_completo.trim(), route };
  } else if (med.receita_pediatrica?.texto_padrao) {
    rawResult = { text: med.receita_pediatrica.texto_padrao.trim(), route };
  }

  if (rawResult) {
    return {
      text: formatReceitaItemText(rawResult.text, rawResult.route),
      route: rawResult.route
    };
  }

  return null;
}

export function standardizeSingleMedication(
  input: string,
  type: 'interna' | 'domiciliar',
  pesoStr?: string | null
): { text: string; route: string } {
  const detectedRoute = detectRouteFromText(input) || (type === 'interna' ? 'IM' : 'VO');
  const matchedMed = findMedicationInDb(input);

  if (matchedMed) {
    if (type === 'interna') {
      const std = getStandardizedInternaMedication(matchedMed, detectedRoute);
      if (std) {
        return { text: std.text, route: std.adm };
      }
    } else {
      const std = getStandardizedDomiciliarMedication(matchedMed, pesoStr);
      if (std) {
        return { text: std.text, route: std.route };
      }
    }
  }

  let clean = input.trim();
  clean = clean.replace(ROUTE_HEADER_REGEX, '').trim();
  clean = clean.replace(/^[ \t]*[-*•\d.]+[ \t]*/, '').trim();

  if (type === 'domiciliar') {
    clean = formatReceitaItemText(clean, detectedRoute);
  }

  return { text: clean, route: detectedRoute };
}

export function standardizePrescriptionList(
  itemsInput: string[] | string,
  type: 'interna' | 'domiciliar',
  pesoStr?: string | null
): string[] {
  const rawList: string[] = Array.isArray(itemsInput)
    ? itemsInput
    : [itemsInput];

  const extractedItems: string[] = [];

  for (const block of rawList) {
    if (!block || typeof block !== 'string') continue;
    const trimmed = block.trim();
    if (!trimmed) continue;

    const sections = trimmed.split(ROUTE_HEADER_REGEX).filter(Boolean);
    if (sections.length > 1) {
      for (const sec of sections) {
        const secItems = splitItems(sec);
        if (secItems.length > 0) {
          extractedItems.push(...secItems);
        } else if (sec.trim()) {
          extractedItems.push(sec.trim());
        }
      }
    } else {
      const split = splitItems(trimmed);
      if (split.length > 0) {
        extractedItems.push(...split);
      } else {
        const lines = trimmed
          .split(/\n{2,}|\n(?=[-*•\d]+\.?\s+)/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length > 0) extractedItems.push(...lines);
        else extractedItems.push(trimmed);
      }
    }
  }

  if (extractedItems.length === 0) return [];

  let assembledPrescription = '';

  for (const rawItem of extractedItems) {
    if (!rawItem.trim()) continue;
    const std = standardizeSingleMedication(rawItem, type, pesoStr);
    if (std.text) {
      assembledPrescription = appendMedicationToPrescription(
        assembledPrescription,
        std.text,
        std.route
      );
    }
  }

  return assembledPrescription ? [assembledPrescription] : [];
}
