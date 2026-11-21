// Quiz ze słuchu: słyszysz znak i wybierasz pinyin, znak albo znaczenie. Pytania budowane z bazy, bez nowych danych.
import { CHARS } from './data.js';
import { norm } from './search.js';
import { readings } from './quiz.js';
import { shuffle } from './srs.js';

export const LISTEN_TYPES = { py: 'Pinyin', hz: 'Znak', pl: 'Znaczenie' };

const plain = (p) => norm(p).replace(/\s+/g, '').replace(/v/g, 'u');
const exact = (p) => p.normalize('NFC').replace(/\s+/g, '').toLowerCase();
const first = (c) => readings(c.pinyin)[0] || c.pinyin;
const meaning = (c) => c.pl.split(/[;,]/)[0].trim();

// Znaki o innym brzmieniu niż c (żaden odczyt się nie pokrywa), więc nie ma dwóch dobrych odpowiedzi.
function differentSound(c, pool) {
  const mine = new Set(readings(c.pinyin).map(exact));
  return pool.filter((o) => o.hanzi !== c.hanzi && !readings(o.pinyin).some((r) => mine.has(exact(r))));
}

// Z podanych kandydatów bierze n różnych etykiet: najpierw „mylące” (to samo pinyin bez tonu), potem reszta.
function pick(c, cands, label, n, confusable) {
  const seen = new Set([label(c)]);
  const out = [];
  const take = (list) => {
    for (const o of shuffle(list)) {
      const l = label(o);
      if (out.length >= n) return;
      if (!seen.has(l)) { seen.add(l); out.push(o); }
    }
  };
  take(cands.filter((o) => confusable(o)));
  take(cands.filter((o) => o.hsk === c.hsk));
  take(cands);
  return out;
}

// Typy pytań możliwe dla znaku: przy znakach wieloodczytaniowych pomijamy pinyin (głos może czytać każde).
export function typesFor(c) {
  const t = ['hz', 'pl'];
  if (readings(c.pinyin).length === 1) t.push('py');
  return t;
}

export function buildQuestion(c, type) {
  const base = differentSound(c, CHARS);
  const sameSyl = (o) => readings(o.pinyin).some((r) => plain(r) === plain(first(c)));
  let label, answer, others;
  if (type === 'py') {
    label = first; answer = first(c);
    others = pick(c, base, first, 3, sameSyl);
  } else if (type === 'hz') {
    label = (o) => o.hanzi; answer = c.hanzi;
    others = pick(c, base, (o) => o.hanzi, 3, sameSyl);
  } else {
    // Znaczenie: odrzucamy kandydatów, których znaczenia pokrywają się z poprawnym (synonimy).
    const mine = new Set(c.pl.split(/[;,]/).map((s) => norm(s).trim()));
    const cands = CHARS.filter((o) => o.hanzi !== c.hanzi && !o.pl.split(/[;,]/).some((s) => mine.has(norm(s).trim())));
    label = meaning; answer = meaning(c);
    others = pick(c, cands, meaning, 3, () => false);
  }
  const options = shuffle([c, ...others]).map((o) => ({ label: label(o), ok: o === c, hanzi: o.hanzi }));
  return { type, answer, options };
}

export function randomType(c, want = 'mix') {
  const ok = typesFor(c);
  if (want !== 'mix' && ok.includes(want)) return want;
  return ok[Math.floor(Math.random() * ok.length)];
}
