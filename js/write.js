// „Napisz znak”: rysowanie palcem na płótnie i ocena ogólnej zgodności kształtu ze wzorem (bez kolejności kresek).
// Ocena: wzór = wypełnione obrysy kresek z strokes/<hex>.json; Twój rysunek jest przesuwany i skalowany tak, by jego ramka
// pasowała do ramki wzoru. Porównujemy linie środkowe: jaka część linii wzoru leży blisko Twojej kreski (pokrycie) i jaka część
// Twojej kreski leży blisko linii wzoru (precyzja); wynik to średnia harmoniczna obu.
import { loadStrokes } from './strokes.js';

const N = 128;                 // rozdzielczość maski oceny
const LINE = 2;                // do oceny porównujemy cienkie linie środkowe kresek (nie wypełnione obrysy)
const REACH = 11;              // odległość (px maski, ok. 9% wymiaru), przy której zgodność spada do zera
export const PASS = 0.65;      // od tego wyniku znak uznajemy za poprawny (do korekty przez użytkownika)

// ——— Płótno do rysowania ———
export function mountPad(canvas, onChange = () => {}) {
  const strokes = [];
  let cur = null;
  let locked = false;
  const ctx = canvas.getContext('2d');
  const css = (v, d) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d;

  function fit() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    draw();
  }

  function draw(extra) {
    const w = canvas.width;
    ctx.clearRect(0, 0, w, canvas.height);
    if (extra) extra(ctx, w);
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, w * 0.035);
    ctx.strokeStyle = css('--pink', '#f0829a');
    ctx.fillStyle = ctx.strokeStyle;
    for (const s of strokes) {
      if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0][0] * w, s[0][1] * w, ctx.lineWidth / 2, 0, 7); ctx.fill(); continue; }
      ctx.beginPath();
      s.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * w) : ctx.moveTo(x * w, y * w)));
      ctx.stroke();
    }
  }

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (locked || e.button > 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    cur = [pos(e)];
    strokes.push(cur);
    draw();
    onChange();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!cur) return;
    e.preventDefault();
    const p = pos(e);
    const l = cur[cur.length - 1];
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 0.004) return;
    cur.push(p);
    draw();
  });
  const up = () => { cur = null; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  fit();

  return {
    strokes,
    count: () => strokes.length,
    undo() { strokes.pop(); draw(); onChange(); },
    clear() { strokes.length = 0; draw(); onChange(); },
    redraw: draw,
    showOnly(fn) { locked = true; ctx.clearRect(0, 0, canvas.width, canvas.height); fn(ctx, canvas.width); },
    destroy() { ro.disconnect(); },
  };
}

// ——— Ocena ———
function maskCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  return c;
}

function refMask(outlines) {
  const c = maskCanvas();
  const g = c.getContext('2d', { willReadFrequently: true });
  const s = N / 1024;
  g.setTransform(s, 0, 0, -s, 0, 900 * s); // dane kresek: oś Y w górę, wysokość 900
  g.fillStyle = '#000';
  for (const d of outlines) g.fill(new Path2D(d));
  const a = g.getImageData(0, 0, N, N).data;
  const m = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) m[i] = a[i * 4 + 3] > 100 ? 1 : 0;
  return m;
}

function skelMask(medians) {
  const c = maskCanvas();
  const g = c.getContext('2d', { willReadFrequently: true });
  const s = N / 1024;
  g.setTransform(s, 0, 0, -s, 0, 900 * s);
  g.lineCap = g.lineJoin = 'round';
  g.lineWidth = LINE / s;
  g.strokeStyle = '#000';
  for (const m of medians) {
    g.beginPath();
    m.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  }
  const a = g.getImageData(0, 0, N, N).data;
  const out = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) out[i] = a[i * 4 + 3] > 60 ? 1 : 0;
  return out;
}

function bbox(m) {
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m[y * N + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

// Przesunięcie i skala rysunku (współrzędne 0–1) do ramki wzoru; zwraca kreski w pikselach maski.
export function align(strokes, ref) {
  const rb = bbox(ref);
  const pts = strokes.flat();
  if (!rb || !pts.length) return null;
  const xs = pts.map((p) => p[0] * N), ys = pts.map((p) => p[1] * N);
  const ub = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  const rw = rb.x1 - rb.x0, rh = rb.y1 - rb.y0, uw = ub.x1 - ub.x0, uh = ub.y1 - ub.y0;
  const f = Math.min(2.5, Math.max(0.4, (rw + rh) / Math.max(1, uw + uh)));
  const rcx = (rb.x0 + rb.x1) / 2, rcy = (rb.y0 + rb.y1) / 2, ucx = (ub.x0 + ub.x1) / 2, ucy = (ub.y0 + ub.y1) / 2;
  return strokes.map((s) => s.map(([x, y]) => [rcx + (x * N - ucx) * f, rcy + (y * N - ucy) * f]));
}

function inkMask(strokesPx) {
  const c = maskCanvas();
  const g = c.getContext('2d', { willReadFrequently: true });
  g.lineCap = g.lineJoin = 'round';
  g.lineWidth = LINE;
  g.strokeStyle = g.fillStyle = '#000';
  for (const s of strokesPx) {
    if (s.length === 1) { g.beginPath(); g.arc(s[0][0], s[0][1], LINE / 2, 0, 7); g.fill(); continue; }
    g.beginPath();
    s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  }
  const a = g.getImageData(0, 0, N, N).data;
  const m = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) m[i] = a[i * 4 + 3] > 100 ? 1 : 0;
  return m;
}

// Przybliżona odległość każdego piksela od najbliższego zapalonego piksela maski (transformata 3–4, w pikselach).
function distance(m) {
  const INF = 1e6;
  const d = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) d[i] = m[i] ? 0 : INF;
  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? INF : d[y * N + x]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
  }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) {
    const i = y * N + x;
    d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
  }
  for (let i = 0; i < N * N; i++) d[i] /= 3;
  return d;
}

// Średnia „miękka” zgodność: punkt maski a ma wartość 1 - odległość do maski b / REACH (nie mniej niż 0).
function soft(a, distB) {
  let sum = 0, n = 0;
  for (let i = 0; i < a.length; i++) if (a[i]) { n++; sum += Math.max(0, 1 - distB[i] / REACH); }
  return n ? sum / n : 0;
}


// Zwraca { score 0–1, cov, prec, aligned (kreski w px maski), strokes: liczba kresek wzoru }.
export async function scoreWriting(strokes, hanzi) {
  const { s: outlines, m: medians } = await loadStrokes(hanzi);
  const ref = refMask(outlines);
  const aligned = align(strokes, ref);
  if (!aligned) return { score: 0, cov: 0, prec: 0, aligned: [], strokes: outlines.length, outlines };
  const skel = skelMask(medians);
  const user = inkMask(aligned);
  const cov = soft(skel, distance(user));
  const prec = soft(user, distance(skel));
  const score = cov + prec ? (2 * cov * prec) / (cov + prec) : 0;
  return { score, cov, prec, aligned, strokes: outlines.length, outlines };
}

// Rysuje wzór (zielony) pod Twoimi kreskami w płótnie wyniku.
export function overlayDrawer(outlines, alignedPx) {
  return (ctx, w) => {
    const s = w / 1024;
    ctx.save();
    ctx.setTransform(s, 0, 0, -s, 0, 900 * s);
    ctx.fillStyle = 'rgba(79, 160, 110, .55)';
    for (const d of outlines) ctx.fill(new Path2D(d));
    ctx.restore();
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, w * 0.03);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--pink').trim() || '#f0829a';
    for (const st of alignedPx) {
      ctx.beginPath();
      st.forEach(([x, y], i) => (i ? ctx.lineTo((x / N) * w, (y / N) * w) : ctx.moveTo((x / N) * w, (y / N) * w)));
      if (st.length === 1) ctx.lineTo((st[0][0] / N) * w + 0.1, (st[0][1] / N) * w);
      ctx.stroke();
    }
    ctx.restore();
  };
}

// Wynik na płótnie: wzór (zielony) i Twoje kreski (różowe), dopasowane do wzoru.
export function paintResult(canvas, res) {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  overlayDrawer(res.outlines, res.aligned)(ctx, canvas.width);
}

// Tylko wzór (gdy ktoś nie pamięta znaku).
export async function paintReference(canvas, hanzi) {
  const { s } = await loadStrokes(hanzi);
  paintResult(canvas, { outlines: s, aligned: [] });
}
