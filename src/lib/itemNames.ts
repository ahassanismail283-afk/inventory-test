// Duplicate detection for item names.
//
// The same drug is often typed in slightly different ways: with or without hamza, ة or ه,
// Arabic or Latin digits, ٪ or %, extra spaces. Names are compared after folding those
// differences away, then by edit distance so small typos are caught too.

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeItemName(name: string): string {
  return name
    .replace(/[ً-ْٰـ]/g, '') // diacritics and tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, d => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/٪/g, '%')
    .replace(/[٫,]/g, '.')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%.]/gu, ''); // drop spaces and punctuation
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = temp;
    }
  }
  return prev[b.length];
}

export interface NameMatch<T> {
  // Same name once spelling variants are folded: treated as the same item
  exact: T | null;
  // Close enough to be probably the same item; the user decides
  similar: T[];
}

export function findMatchingItems<T extends { name: string }>(name: string, candidates: T[]): NameMatch<T> {
  const target = normalizeItemName(name);
  if (!target) return { exact: null, similar: [] };

  let exact: T | null = null;
  const similar: T[] = [];
  for (const c of candidates) {
    const other = normalizeItemName(c.name);
    if (!other) continue;
    if (other === target) {
      exact = exact ?? c;
      continue;
    }
    // Different strengths or sizes (سرنجة 10 سم / سرنجة 20 سم) are different items
    const digitsA = target.replace(/[^0-9]/g, '');
    const digitsB = other.replace(/[^0-9]/g, '');
    if (digitsA && digitsB && digitsA !== digitsB) continue;
    const shorter = Math.min(other.length, target.length);
    const longer = Math.max(other.length, target.length);
    const contains = shorter >= 4 && (other.includes(target) || target.includes(other));
    const close = longer >= 4 && editDistance(other, target) <= Math.max(1, Math.floor(longer * 0.2));
    if (contains || close) similar.push(c);
  }
  return { exact, similar };
}
