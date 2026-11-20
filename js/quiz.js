// Ocena odpowiedzi w quizie: pinyin (bez tonu), ton, znaczenie (PL lub EN).
import { norm } from './search.js';

const MARKS = { '̄': 1, '́': 2, '̌': 3, '̀': 4 };

// 1–4 wg znaku diakrytycznego, 5 = ton lekki (brak znaku).
export function toneOf(pinyin) {
  for (const ch of pinyin.normalize('NFD')) if (MARKS[ch]) return MARKS[ch];
  return 5;
}

export const TONE_LABEL = { 1: 'ton 1 (ā)', 2: 'ton 2 (á)', 3: 'ton 3 (ǎ)', 4: 'ton 4 (à)', 5: 'ton lekki' };

const syllable = (s) => norm(s).replace(/\s+/g, '').replace(/v/g, 'u');

export function checkPinyin(input, c) {
  const a = syllable(input);
  return a !== '' && a === syllable(c.pinyin);
}

// Zdejmujemy „to ”, „a ”, „the ”, żeby „eat” pasowało do „to eat”.
const clean = (t) => norm(t).trim().replace(/^(to|a|an|the)\s+/, '');

function meaningTokens(c) {
  return [...c.pl.split(/[;,]/), ...c.en.split(/[;,]/)].map(clean).filter(Boolean);
}

function lev(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

// Wystarczy trafić jedno ze znaczeń: dokładnie, jako słowo z wielowyrazowego znaczenia (≥3 litery)
// albo z jedną literówką (≥5 liter).
export function checkMeaning(input, c) {
  const a = clean(input);
  if (!a) return false;
  return meaningTokens(c).some(
    (t) => t === a || (a.length >= 3 && t.split(/\s+/).includes(a)) || (a.length >= 5 && lev(a, t) <= 1)
  );
}

export function gradeAnswer({ py, tone, meaning }, c) {
  const res = {
    py: { ok: checkPinyin(py, c), val: py.trim() },
    tone: { ok: tone === toneOf(c.pinyin), val: tone },
    meaning: { ok: checkMeaning(meaning, c), val: meaning.trim() },
  };
  res.pts = Number(res.py.ok) + Number(res.tone.ok) + Number(res.meaning.ok);
  res.full = res.pts === 3;
  return res;
}
