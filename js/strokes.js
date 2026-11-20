// Animacja kolejności kresek. Dane: strokes/<kod-hex>.json = { s: [ścieżki obrysu], m: [[x,y]… mediany] }
// (wygenerowane z hanzi-writer-data narzędziem tools/build-strokes.mjs).
// Technika: każda kreska to obrys użyty jako clipPath; przez niego „rysujemy” grubą linię po medianie.

const NS = 'http://www.w3.org/2000/svg';
const cache = new Map();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function loadStrokes(hanzi) {
  const cp = hanzi.codePointAt(0).toString(16);
  if (cache.has(cp)) return cache.get(cp);
  const r = await fetch(`strokes/${cp}.json`);
  if (!r.ok) throw new Error('brak danych kresek');
  const d = await r.json();
  cache.set(cp, d);
  return d;
}

const medianPath = (pts) => 'M' + pts.map(([x, y]) => `${x} ${y}`).join(' L');
const strokesWord = (n) => (n === 1 ? 'kreska' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'kreski' : 'kresek');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Rysowanie: odsłaniamy kreskę rosnącą kreską przerywaną. Dla zerowej długości ukrywamy element,
// bo zaokrąglone zakończenie narysowałoby kropkę.
function tween(el, len, ms, alive) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now) => {
      if (!alive()) return resolve(false);
      const p = Math.min(1, (now - t0) / ms);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease in-out
      const drawn = len * e;
      if (drawn > 0.5) {
        el.style.visibility = 'visible';
        el.style.strokeDasharray = `${drawn} ${len * 2}`;
      }
      if (p < 1) requestAnimationFrame(step);
      else { el.style.strokeDasharray = 'none'; resolve(true); }
    };
    requestAnimationFrame(step);
  });
}

// Zwraca true, gdy animacja została zamontowana; false, gdy brak danych (zostaje statyczny znak).
export async function mountStrokes(box, hanzi) {
  let data;
  try { data = await loadStrokes(hanzi); } catch { return false; }
  if (!box.isConnected) return false;

  const id = 'sk' + Math.random().toString(36).slice(2, 7);
  const { s: outlines, m: medians } = data;
  const n = outlines.length;

  box.innerHTML = `
    <div class="wframe"><svg class="stroke-svg" viewBox="0 0 1024 1024" role="img" aria-label="Kolejność kresek znaku ${hanzi}">
      <defs>${outlines.map((d, i) => `<clipPath id="${id}c${i}"><path d="${d}"/></clipPath>`).join('')}</defs>
      <g class="stroke-grid"><path d="M512 0V1024M0 512H1024"/></g>
      <g transform="translate(0 900) scale(1 -1)">
        <g class="stroke-ghost">${outlines.map((d) => `<path d="${d}"/>`).join('')}</g>
        <g>${medians.map((m, i) => `<g clip-path="url(#${id}c${i})"><path class="stroke-line" d="${medianPath(m)}"/></g>`).join('')}</g>
      </g>
    </svg></div>
    <figcaption class="stroke-count" aria-live="off"></figcaption>`;

  const lines = [...box.querySelectorAll('.stroke-line')];
  const count = box.querySelector('.stroke-count');
  const lens = lines.map((l) => l.getTotalLength());
  const setHidden = (i) => { lines[i].style.visibility = 'hidden'; lines[i].style.strokeDasharray = `0 ${lens[i] * 2}`; lines[i].classList.remove('drawing'); };
  const setShown = (i) => { lines[i].style.visibility = 'visible'; lines[i].style.strokeDasharray = 'none'; lines[i].classList.remove('drawing'); };

  let token = 0;
  const play = async () => {
    const mine = ++token;
    const alive = () => mine === token && box.isConnected;
    while (alive()) {
      lines.forEach((_, i) => setHidden(i));
      count.textContent = `${n} ${strokesWord(n)}`;
      await sleep(350);
      for (let i = 0; i < n; i++) {
        if (!alive()) return;
        count.textContent = `kreska ${i + 1} z ${n}`;
        lines[i].classList.add('drawing');
        const ok = await tween(lines[i], lens[i], 280 + lens[i] * 0.9, alive);
        if (!ok) return;
        lines[i].classList.remove('drawing');
        await sleep(180);
      }
      count.textContent = `${n} ${strokesWord(n)}`;
      await sleep(1800);
    }
  };

  if (reduced()) {
    lines.forEach((_, i) => setShown(i));
    count.textContent = `${n} ${strokesWord(n)}`;
  } else {
    play();
  }
  return true;
}
