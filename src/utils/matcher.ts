import { AnswerSlot } from '../types/game';

const STOP_WORDS = new Set(['a', 'an', 'the', 'my', 'your', 'to', 'of', 'in', 'on', 'and', 'or', 'for']);

export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word))
    .join(' ')
    .trim();
}

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && !word.endsWith('ses')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function isPhraseMatch(guessNorm: string, candidateRaw: string): boolean {
  const candNorm = normalizeText(candidateRaw);
  if (!guessNorm || !candNorm) return false;

  if (guessNorm === candNorm) return true;

  const guessWords = guessNorm.split(' ').map(singularize);
  const candWords = candNorm.split(' ').map(singularize);
  const guessSing = guessWords.join(' ');
  const candSing = candWords.join(' ');

  if (guessSing === candSing) return true;

  // Check if guess matches a slash-separated variant like "Vacuuming / Sweeping"
  if (candidateRaw.includes('/')) {
    const parts = candidateRaw.split('/').map((p) => p.trim());
    if (parts.some((part) => isPhraseMatch(guessNorm, part))) return true;
  }

  // Allow strong substring word match when guess is >= 4 chars and matches a key word in the answer
  if (guessSing.length >= 4) {
    if (candWords.some((cw) => cw === guessSing)) return true;
    if (guessWords.some((gw) => gw.length >= 4 && candWords.includes(gw))) {
      // Only match single word against multi-word answer if it's a substantial match
      if (candWords.length <= 3) return true;
    }
  }

  // Fuzzy typo tolerance (Levenshtein)
  const maxDist = candSing.length >= 7 ? 2 : candSing.length >= 4 ? 1 : 0;
  if (maxDist > 0 && levenshtein(guessSing, candSing) <= maxDist) {
    return true;
  }

  return false;
}

export interface MatchResult {
  matched: boolean;
  slot?: AnswerSlot;
  alreadyRevealed?: boolean;
}

export function matchPlayerAnswer(
  input: string,
  answers: AnswerSlot[],
  revealedIds: Set<string>
): MatchResult {
  const guessNorm = normalizeText(input);
  if (!guessNorm) {
    return { matched: false };
  }

  // First check unrevealed answers so any overlapping phrase favors open slots
  for (const slot of answers) {
    if (revealedIds.has(slot.id)) continue;
    const candidates = [slot.text, ...(slot.aliases || [])];
    if (candidates.some((c) => isPhraseMatch(guessNorm, c))) {
      return { matched: true, slot, alreadyRevealed: false };
    }
  }

  // Then check already-revealed answers so players get polite "already revealed" feedback
  for (const slot of answers) {
    if (!revealedIds.has(slot.id)) continue;
    const candidates = [slot.text, ...(slot.aliases || [])];
    if (candidates.some((c) => isPhraseMatch(guessNorm, c))) {
      return { matched: true, slot, alreadyRevealed: true };
    }
  }

  return { matched: false };
}
