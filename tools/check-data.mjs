// Kontrola danych przed wydaniem: node tools/check-data.mjs
// Sprawdza: unikalność znaków, poziomy HSK, pinyin i znaczenia (PL, EN), plik kresek dla każdego znaku, co najmniej jedno zdanie
// przykładowe na znak, poprawność wpisów zdań i listę strokes/index.json. Kod wyjścia 1, gdy są błędy.
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mem = { getItem: () => null, setItem() {}, removeItem() {} }; // js/sentences.js importuje store.js, który zagląda do pamięci przeglądarki
globalThis.localStorage = mem;
globalThis.sessionStorage = mem;

const { CHARS, LEVELS } = await import(join(root, 'js/data.js'));
const { SENTENCES, bestSentence } = await import(join(root, 'js/sentences.js'));

const errors = [];
const warns = [];
const err = (m) => errors.push(m);

const seen = new Set();
const levels = new Set(LEVELS.map((l) => l.n));
const index = existsSync(join(root, 'strokes/index.json')) ? JSON.parse(readFileSync(join(root, 'strokes/index.json'), 'utf8')) : [];
const inIndex = new Set(index);

for (const c of CHARS) {
  const h = c.hanzi;
  if ([...h].length !== 1) err(`${h}: to nie jest pojedynczy znak`);
  if (seen.has(h)) err(`${h}: duplikat w js/data.js`);
  seen.add(h);
  if (!levels.has(c.hsk)) err(`${h}: nieznany poziom HSK ${c.hsk}`);
  if (!c.pinyin?.trim()) err(`${h}: brak pinyin`);
  if (!c.pl?.trim()) err(`${h}: brak znaczenia po polsku`);
  if (!c.en?.trim()) err(`${h}: brak znaczenia po angielsku`);
  if (/\s{2,}|^\s|\s$/.test(`${c.pinyin}${c.pl}${c.en}`)) warns.push(`${h}: zbędne spacje w polach`);
  const hex = h.codePointAt(0).toString(16);
  if (!existsSync(join(root, 'strokes', `${hex}.json`))) err(`${h}: brak pliku kresek strokes/${hex}.json`);
  if (index.length && !inIndex.has(hex)) err(`${h}: brak w strokes/index.json`);
  if (!bestSentence(h)) err(`${h}: brak zdania przykładowego`);
}

SENTENCES.forEach(([zh, py, pl], i) => {
  if (!zh || !py || !pl) err(`zdanie #${i}: pusty chiński, pinyin lub polski`);
  if (!/[。？！]$/.test(zh)) warns.push(`zdanie #${i} (${zh}): brak znaku końca zdania`);
});

const known = new Set(CHARS.map((c) => c.hanzi.codePointAt(0).toString(16)));
for (const hex of index) if (!known.has(hex)) warns.push(`strokes/index.json: ${hex} nie ma w js/data.js`);

const byLevel = LEVELS.map((l) => `HSK ${l.n}: ${CHARS.filter((c) => c.hsk === l.n).length}`).filter((s) => !s.endsWith(': 0'));
console.log(`Znaków: ${CHARS.length} (${byLevel.join(', ')}); zdań: ${SENTENCES.length}`);
warns.forEach((m) => console.log(`UWAGA ${m}`));
errors.forEach((m) => console.log(`BŁĄD  ${m}`));
console.log(errors.length ? `Znaleziono błędów: ${errors.length}` : 'Dane są spójne.');
process.exit(errors.length ? 1 : 0);
