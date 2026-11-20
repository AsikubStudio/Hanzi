// Generuje strokes/<kod-hex>.json dla każdego znaku z js/data.js.
// Użycie: node tools/build-strokes.mjs /ścieżka/do/hanzi-writer-data
// (repo https://github.com/chanind/hanzi-writer-data, katalog data/ z plikami <znak>.json)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) { console.error('Podaj ścieżkę do hanzi-writer-data'); process.exit(1); }

const { CHARS } = await import(join(root, 'js/data.js'));
const out = join(root, 'strokes');
mkdirSync(out, { recursive: true });

let ok = 0; const missing = []; const index = [];
for (const { hanzi } of CHARS) {
  try {
    const d = JSON.parse(readFileSync(join(src, 'data', `${hanzi}.json`), 'utf8'));
    const file = join(out, `${hanzi.codePointAt(0).toString(16)}.json`);
    writeFileSync(file, JSON.stringify({ s: d.strokes, m: d.medians }));
    index.push(hanzi.codePointAt(0).toString(16));
    ok++;
  } catch { missing.push(hanzi); }
}
writeFileSync(join(out, 'index.json'), JSON.stringify(index)); // lista do precache w sw.js
console.log(`zapisano ${ok}, brak danych: ${missing.join(' ') || 'nic'}`);
