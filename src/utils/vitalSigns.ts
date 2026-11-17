export function isPaAbnormal(raw: string | undefined): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed.length < 3) return false;

  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(?:[xX\/\-]|x|\s)\s*(\d+(?:[.,]\d+)?)/);
  if (match) {
    let pas = parseFloat(match[1].replace(',', '.'));
    let pad = parseFloat(match[2].replace(',', '.'));
    if (pas < 30) pas *= 10;
    if (pad < 20) pad *= 10;
    return pas < 90 || pas >= 140 || pad < 60 || pad >= 90;
  }

  const singleNum = parseFloat(trimmed.replace(',', '.'));
  if (!isNaN(singleNum) && trimmed.length >= 3) {
    let pas = singleNum < 30 ? singleNum * 10 : singleNum;
    return pas < 90 || pas >= 140;
  }

  return false;
}

export function isFcAbnormal(raw: string | undefined): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed.length < 2) return false;
  const val = parseFloat(trimmed.replace(',', '.'));
  if (isNaN(val)) return false;
  return val < 60 || val > 100;
}

export function isFrAbnormal(raw: string | undefined): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed.length < 2) return false;
  const val = parseFloat(trimmed.replace(',', '.'));
  if (isNaN(val)) return false;
  return val < 12 || val > 20;
}

export function isSatAbnormal(raw: string | undefined): boolean {
  if (!raw) return false;
  const trimmed = raw.trim().replace('%', '');
  if (trimmed.length < 2) return false;
  const val = parseFloat(trimmed.replace(',', '.'));
  if (isNaN(val)) return false;
  return val < 95 || val > 100;
}

export function isTaxAbnormal(raw: string | undefined): boolean {
  if (!raw) return false;
  const trimmed = raw.trim().replace('°C', '').replace('ºC', '').replace('C', '');
  if (trimmed.length < 2) return false;
  let val = parseFloat(trimmed.replace(',', '.'));
  if (isNaN(val)) return false;
  if (val > 100) val = val / 10;
  return val < 35.5 || val >= 37.8;
}

export function isGlicemiaAbnormal(raw: string | undefined): boolean {
  if (!raw) return false;
  const trimmed = raw.trim().replace(/mg\/dL/i, '').replace(/hgt/i, '').trim();
  if (trimmed.length < 2) return false;
  const val = parseFloat(trimmed.replace(',', '.'));
  if (isNaN(val)) return false;
  return val < 70 || val >= 180;
}
