// Wyszukiwarka: pinyin bez tonów, znaczenia po polsku i angielsku, oraz sam znak.
import { CHARS } from './data.js';

// Zdejmuje tony i polskie ogonki: „mǎ” → „ma”, „lǜ” → „lu”, „łódź” → „lodz”.
export function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');
}

const tokens = (s) => s.split(/[;,]/).map((t) => norm(t).trim()).filter(Boolean);

const INDEX = CHARS.map((c) => ({
  c,
  py: c.pinyin.split(/[;,]/).map((r) => norm(r).replace(/\s+/g, '')).filter(Boolean), // wiele odczytań: „jiào; jué”
  en: tokens(c.en),
  pl: tokens(c.pl),
}));

function scoreMeaning(list, q) {
  let best = 0;
  for (const t of list) {
    if (t === q) best = Math.max(best, 80);
    else if (q.length < 3) continue; // krótkie frazy (np. „ma”) to głównie pinyin, nie szukamy ich w znaczeniach
    else if (t.startsWith(q)) best = Math.max(best, 60);
    else if (t.split(/\s+/).some((w) => w.startsWith(q))) best = Math.max(best, 50);
    else if (t.includes(q)) best = Math.max(best, 30);
  }
  return best;
}

export function search(raw) {
  const text = raw.trim();
  if (!text) return [];
  const q = norm(text).replace(/[0-9]/g, '').trim();
  const qp = q.replace(/\s+/g, '').replace(/v/g, 'u'); // „nv” → „nu” (ü)
  const hanziIn = [...text];

  const out = [];
  for (const row of INDEX) {
    let s = 0;
    if (hanziIn.includes(row.c.hanzi)) s = 100;
    if (qp) {
      if (row.py.some((r) => r === qp)) s = Math.max(s, 90);
      else if (row.py.some((r) => r.startsWith(qp))) s = Math.max(s, 70);
    }
    if (q) s = Math.max(s, scoreMeaning(row.pl, q), scoreMeaning(row.en, q));
    if (s) out.push({ c: row.c, s });
  }
  return out.sort((a, b) => b.s - a.s || a.c.hsk - b.c.hsk).map((r) => r.c);
}
