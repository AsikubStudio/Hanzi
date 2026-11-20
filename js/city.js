// Miasto lampionów: tło kafla serii. Od 15. dnia serii rośnie nocna ulica w jednopunktowej perspektywie
// (jeden nowy element dziennie, do pełnej sceny w 365. dniu, 351 kroków).
// Kolejność: droga (dzień 15), 24 lampy wzdłuż ulicy, odległa panorama, potem kwartały od horyzontu ku widzowi
// (bryła, okna zapalane po jednym, neony z hanzi), lampiony zawieszone w poprzek ulicy, samochody, brama, księżyc.
// Scena jest deterministyczna: ten sam dzień serii zawsze daje ten sam obraz.

export const CITY_FROM = 14; // po tylu dniach seria ma pełną girlandę; miasto zaczyna się dzień później

// ——— Kamera: widok wzdłuż ulicy, punkt zbiegu w VP ———
const VW = 360, VH = 270;
const VPX = 180, VPY = 140; // horyzont
const F = 300;              // ogniskowa (px na jednostkę świata przy z = 1)
const CAM = 1.5;            // wysokość kamery nad jezdnią
const SW = 8;               // połowa szerokości ulicy do linii elewacji

const P = (x, y, z) => [VPX + (x * F) / z, VPY - ((y - CAM) * F) / z];
const rnd = (i) => { const v = Math.sin(i * 91.7 + 12.9898) * 43758.5453; return v - Math.floor(v); };
const fx = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${fx(p[0])} ${fx(p[1])}`;
const quad = (pts, attrs = '') => `<path d="M${pts.map(pt).join('L')}Z" ${attrs}/>`;

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const fog = (c, z) => mix(c, '#4c2368', Math.min(0.92, Math.max(0, (z - 12) / 150)));

const COL = { pink: '#ff4f9a', cyan: '#4fe3f0', amber: '#ffc15e', violet: '#a98bff' };
const COLS = [COL.pink, COL.cyan, COL.amber, COL.violet, COL.pink];
const GLOW = { '#ff4f9a': 'gPink', '#4fe3f0': 'gCyan', '#ffc15e': 'gAmber', '#a98bff': 'gViolet' };
const NEON = ['茶', '饭', '店', '馆', '吃', '喝', '家', '好', '爱', '学', '水', '火', '月', '日', '中', '国', '米', '书', '医', '院', '钱', '电', '车', '站'];

const ZB = [10, 22, 34, 48, 64, 82, 104, 130, 160]; // granice kwartałów wzdłuż ulicy

// ——— Elementy stałe ———
const defs = `<defs>
  ${[['gPink', '#ff7fb2'], ['gCyan', '#7ff0ff'], ['gAmber', '#ffd58a'], ['gViolet', '#c0a8ff']].map(([id, c]) =>
    `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".62"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}
  ${[['rPink', '#ff4f9a'], ['rCyan', '#4fe3f0'], ['rAmber', '#ffc15e'], ['rViolet', '#a98bff']].map(([id, c]) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".4"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`).join('')}
  <linearGradient id="cSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0f3d" stop-opacity="0"/><stop offset=".62" stop-color="#7a2a86" stop-opacity=".5"/><stop offset="1" stop-color="#e0509a" stop-opacity=".62"/></linearGradient>
  <linearGradient id="cRoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a2a70"/><stop offset=".25" stop-color="#2a1340"/><stop offset="1" stop-color="#0b0716"/></linearGradient>
  <radialGradient id="cHaze"><stop offset="0" stop-color="#ff7fb2" stop-opacity=".5"/><stop offset=".55" stop-color="#b13c9a" stop-opacity=".2"/><stop offset="1" stop-color="#b13c9a" stop-opacity="0"/></radialGradient>
</defs>`;

function skySVG() {
  return `<rect x="0" y="0" width="${VW}" height="${VPY + 8}" fill="url(#cSky)"/>`;
}

function groundSVG() {
  const zN = 2.9, zF = 420;
  let s = quad([P(-SW, 0, zN), P(SW, 0, zN), P(SW, 0, zF), P(-SW, 0, zF)], 'fill="url(#cRoad)"');
  // chodniki
  s += quad([P(-SW, 0, zN), P(-5, 0, zN), P(-5, 0, zF), P(-SW, 0, zF)], 'fill="#3b1f55" opacity=".55"');
  s += quad([P(SW, 0, zN), P(5, 0, zN), P(5, 0, zF), P(SW, 0, zF)], 'fill="#3b1f55" opacity=".55"');
  // przerywana linia środkowa
  for (let z = 6; z < 150; z += 5) s += quad([P(-0.14, 0, z), P(0.14, 0, z), P(0.14, 0, z + 2.4), P(-0.14, 0, z + 2.4)], 'fill="#ffd79a" opacity=".38"');
  // przejście dla pieszych blisko widza
  for (let k = -3; k <= 3; k++) s += quad([P(k * 1.3 - 0.45, 0, 11.5), P(k * 1.3 + 0.45, 0, 11.5), P(k * 1.3 + 0.45, 0, 14.5), P(k * 1.3 - 0.45, 0, 14.5)], 'fill="#e8d6ff" opacity=".13"');
  return s;
}

const hazeSVG = () => `<ellipse cx="${VPX}" cy="${VPY + 6}" rx="150" ry="85" fill="url(#cHaze)"/>`;

// ——— Kwartały ———
function makeBlocks() {
  const blocks = [];
  for (let k = 0; k < 8; k++) {
    for (const side of [-1, 1]) {
      const i = k * 2 + (side > 0 ? 1 : 0);
      const tall = rnd(i + 3) > 0.78;
      const h = 18 + rnd(i + 7) * 15 + (tall ? 9 : 0);
      const sb = rnd(i + 11) * 1.8;
      blocks.push({ k, side, i, z0: ZB[k], z1: ZB[k + 1], h, xf: side * (SW + sb), shop: COLS[(i * 3 + 1) % COLS.length] });
    }
  }
  return blocks;
}

// Komórki okien na elewacji (płaszczyzna x = xf): tylko widoczne w kadrze.
function windowCells(b) {
  const cells = [];
  for (let y = 4.4; y + 1.7 < b.h - 0.7; y += 2.9) {
    for (let z = b.z0 + 1; z + 1.3 < b.z1 - 0.7; z += 2.3) {
      const c = [P(b.xf, y, z), P(b.xf, y, z + 1.3), P(b.xf, y + 1.7, z + 1.3), P(b.xf, y + 1.7, z)];
      const hpx = c[0][1] - c[3][1];
      const inside = c.every(([x, yy]) => x > 1 && x < VW - 1 && yy > 2 && yy < VH - 2);
      if (inside && hpx >= 2) cells.push(c);
    }
  }
  return cells
    .map((c, n) => [c, rnd(b.i * 17 + n * 5 + 2)])
    .sort((p, q) => p[1] - q[1])
    .map(([c]) => c);
}

function blockSVG(b, cells) {
  const base = '#150b2b';
  const face = fog(base, (b.z0 + b.z1) / 2);
  const front = fog('#201240', b.z0);
  const xo = b.xf + b.side * 10; // głębokość budynku
  let s = '';
  // ściana czołowa (widoczna przy uskokach i różnicach wysokości)
  s += quad([P(b.xf, 0, b.z0), P(xo, 0, b.z0), P(xo, b.h, b.z0), P(b.xf, b.h, b.z0)], `fill="${front}"`);
  // elewacja
  s += quad([P(b.xf, 0, b.z0), P(b.xf, 0, b.z1), P(b.xf, b.h, b.z1), P(b.xf, b.h, b.z0)], `fill="${face}"`);
  // gzyms przy dachu (podkreśla krawędź)
  s += quad([P(b.xf, b.h - 0.5, b.z0), P(b.xf, b.h - 0.5, b.z1), P(b.xf, b.h, b.z1), P(b.xf, b.h, b.z0)], `fill="${mix(face, '#7a4aa0', 0.35)}"`);
  // witryny parteru (świecące pasy) i poświata na jezdni
  s += quad([P(b.xf, 0.2, b.z0 + 0.4), P(b.xf, 0.2, b.z1 - 0.4), P(b.xf, 3.6, b.z1 - 0.4), P(b.xf, 3.6, b.z0 + 0.4)], `fill="${b.shop}" opacity=".5"`);
  s += quad([P(b.side * 5, 0, b.z0), P(b.side * SW, 0, b.z0), P(b.side * SW, 0, b.z1), P(b.side * 5, 0, b.z1)], `fill="${b.shop}" opacity=".16"`);
  // ciemne szyby (siatka pięter) pod zapalanymi oknami
  const panes = cells.slice(0, 70);
  if (panes.length) s += `<path d="${panes.map((c) => `M${c.map(pt).join('L')}Z`).join('')}" fill="${mix(face, '#4a2a78', 0.6)}"/>`;
  return s;
}

const winSVG = (c, i) => {
  const warm = rnd(i * 3.1) > 0.3;
  return `<path class="cwin" d="M${c.map(pt).join('L')}Z" fill="${warm ? '#ffd79a' : rnd(i * 1.7) > 0.5 ? '#ff9fc4' : '#8ff2ff'}"/>`;
};

// Neon prostopadły do ulicy (płaszczyzna z = const, patrzy na widza), z odbiciem na mokrej jezdni.
function signSVG(b, n, glyphs, ci) {
  const col = COLS[ci % COLS.length];
  const zs = b.z0 + 2 + rnd(b.i * 9 + n) * (b.z1 - b.z0 - 4);
  const w = 1.7;
  const maxTop = Math.min(b.h - 1, CAM + (VPY * zs) / F - 1.2); // żeby neon mieścił się w kadrze
  const h = Math.min(6.5 + rnd(b.i * 7 + n * 3) * 3.5, maxTop - 2.6);
  const y0 = 2.4 + rnd(b.i * 5 + n * 2) * Math.max(0, maxTop - h - 2.4);
  const xa = b.side > 0 ? b.xf - w : b.xf;
  const [x1, y1] = P(xa, y0 + h, zs);
  const [x2, y2] = P(xa + w, y0, zs);
  const wpx = x2 - x1, hpx = y2 - y1;
  if (h < 2.5 || x1 < -4 || x2 > VW + 4 || y1 < -2) return null;
  const fs = wpx * 0.8;
  const rg = 'r' + GLOW[col].slice(1);
  // odbicie: lustrzany obraz pod jezdnią
  const [, ry1] = P(xa, -y0, zs);
  const [, ry2] = P(xa, -(y0 + h), zs);
  return {
    d: zs,
    svg: `<g class="neon" style="--nc:${col};--d:${((ci * 0.73) % 4).toFixed(2)}s">`
      + `<rect x="${fx(x1)}" y="${fx(y1)}" width="${fx(wpx)}" height="${fx(hpx)}" rx="${fx(Math.max(1, wpx * 0.1))}" fill="#0b0511" fill-opacity=".78" stroke="${col}" stroke-width="${fx(Math.max(0.8, wpx * 0.06))}"/>`
      + `<text x="${fx(x1 + wpx / 2)}" y="${fx(y1 + hpx * 0.4 + fs * 0.32)}" text-anchor="middle" font-size="${fx(fs)}" fill="${col}" class="neon-t">${glyphs[0]}</text>`
      + `<text x="${fx(x1 + wpx / 2)}" y="${fx(y1 + hpx * 0.8 + fs * 0.32)}" text-anchor="middle" font-size="${fx(fs)}" fill="${col}" class="neon-t">${glyphs[1]}</text></g>`
      + `<rect x="${fx(x1 + wpx * 0.1)}" y="${fx(ry1)}" width="${fx(wpx * 0.8)}" height="${fx(Math.min(45, Math.max(1, ry2 - ry1)))}" fill="url(#${rg})" opacity=".4"/>`,
  };
}

// ——— Lampy uliczne ———
function lampSVG(i) {
  const side = i % 2 ? 1 : -1;
  const k = Math.floor(i / 2);
  const z = 11.5 * Math.pow(150 / 11.5, k / 11) * (side > 0 ? 1 : 1.13);
  const x = side * 6.3;
  const col = [COL.amber, COL.pink, COL.cyan][k % 3];
  const g = GLOW[col];
  const [bx, by] = P(x, 0, z);
  const [tx, ty] = P(x, 6.6, z);
  const [hx, hy] = P(x - side * 1.1, 6.9, z);
  const s = F / z;
  return {
    d: z,
    svg: `<g class="clamp" style="--d:${(i * 0.31).toFixed(2)}s">`
      + `<ellipse cx="${fx(bx - side * 3 * s)}" cy="${fx(by + 0.2 * s)}" rx="${fx(4 * s)}" ry="${fx(Math.max(0.6, 0.55 * s))}" fill="url(#${g})" opacity=".55"/>`
      + `<path d="M${fx(bx)} ${fx(by)}V${fx(ty)}L${fx(hx)} ${fx(hy)}" stroke="#2a1840" stroke-width="${fx(Math.max(0.7, 0.16 * s))}" fill="none"/>`
      + `<circle cx="${fx(hx)}" cy="${fx(hy)}" r="${fx(Math.max(3, 1.4 * s))}" fill="url(#${g})"/>`
      + `<circle cx="${fx(hx)}" cy="${fx(hy)}" r="${fx(Math.max(0.7, 0.18 * s))}" fill="#fff4e0"/></g>`,
  };
}

// ——— Lampiony zawieszone w poprzek ulicy ———
function stringSVG(z) {
  const ys = Math.min(15, 0.4 * z + 0.2);
  const sag = 2.4;
  const pts = [];
  for (let u = 0; u <= 1.0001; u += 0.1) pts.push(P(-SW + 2 * SW * u, ys - 4 * sag * u * (1 - u), z));
  return `<path d="M${pts.map(pt).join('L')}" fill="none" stroke="#9a7fb0" stroke-width="${fx(Math.max(0.5, 0.05 * F / z))}" opacity=".7"/>`;
}

function lanternSVG(z, k, n) {
  const ys = Math.min(15, 0.4 * z + 0.2);
  const u = (k + 1) / (n + 1);
  const yTop = ys - 2.4 * 4 * u * (1 - u);
  const [cx, cy] = P(-SW + 2 * SW * u, yTop - 1.1, z);
  const s = F / z;
  const rx = Math.max(1.4, 0.42 * s), ry = Math.max(1.8, 0.56 * s);
  return `<g class="clamp" style="--d:${((k * 0.37 + z * 0.01) % 3).toFixed(2)}s"><circle cx="${fx(cx)}" cy="${fx(cy)}" r="${fx(Math.max(4, 1.35 * s))}" fill="url(#gPink)"/>`
    + `<path d="M${fx(cx)} ${fx(cy - ry - 0.9 * s * 0.5)}V${fx(cy - ry)}" stroke="#9a7fb0" stroke-width=".5"/>`
    + `<ellipse cx="${fx(cx)}" cy="${fx(cy)}" rx="${fx(rx)}" ry="${fx(ry)}" fill="#f07aa0"/><ellipse cx="${fx(cx)}" cy="${fx(cy)}" rx="${fx(rx * 0.55)}" ry="${fx(ry * 0.72)}" fill="#ffd9e5"/></g>`;
}

// ——— Samochody (widok z tyłu na prawym pasie, z przodu na lewym) ———
function carSVG(z, side, i) {
  const x = side * 2.5;
  const [x1, y1] = P(x - 0.95, 1.55, z);
  const [x2, y2] = P(x + 0.95, 0, z);
  const w = x2 - x1, h = y2 - y1;
  const lit = side > 0 ? '#ff3b5c' : '#fff2c9';
  const lg = side > 0 ? 'gPink' : 'gAmber';
  const ly = y1 + h * 0.55;
  return {
    d: z,
    svg: `<g><ellipse cx="${fx((x1 + x2) / 2)}" cy="${fx(y2 + 0.5)}" rx="${fx(w * 0.75)}" ry="${fx(Math.max(1, h * 0.28))}" fill="url(#${lg})" opacity=".55"/>`
      + `<rect x="${fx(x1)}" y="${fx(y1 + h * 0.22)}" width="${fx(w)}" height="${fx(h * 0.78)}" rx="${fx(h * 0.18)}" fill="#0a0612"/>`
      + `<rect x="${fx(x1 + w * 0.14)}" y="${fx(y1)}" width="${fx(w * 0.72)}" height="${fx(h * 0.34)}" rx="${fx(h * 0.12)}" fill="#120a1e"/>`
      + `<circle cx="${fx(x1 + w * 0.17)}" cy="${fx(ly)}" r="${fx(Math.max(1, h * 0.11))}" fill="${lit}"/><circle cx="${fx(x2 - w * 0.17)}" cy="${fx(ly)}" r="${fx(Math.max(1, h * 0.11))}" fill="${lit}"/>`
      + `<circle cx="${fx(x1 + w * 0.17)}" cy="${fx(ly)}" r="${fx(Math.max(2.5, h * 0.3))}" fill="url(#${lg})"/><circle cx="${fx(x2 - w * 0.17)}" cy="${fx(ly)}" r="${fx(Math.max(2.5, h * 0.3))}" fill="url(#${lg})"/></g>`,
  };
}

// ——— Brama pailou nad ulicą ———
function gateParts(z) {
  const post = (x) => { const a = P(x - 0.45, 0, z), b = P(x + 0.45, 9.2, z); return `<rect x="${fx(a[0])}" y="${fx(b[1])}" width="${fx(b[0] - a[0])}" height="${fx(a[1] - b[1])}" fill="#5a1530"/>`; };
  const posts = post(-6.8) + post(6.8);
  const bl = P(-7.8, 9.2, z), br = P(7.8, 10.4, z);
  const beam = `<rect x="${fx(bl[0])}" y="${fx(br[1])}" width="${fx(br[0] - bl[0])}" height="${fx(bl[1] - br[1])}" fill="#7a1b40"/>`
    + `<rect x="${fx(bl[0])}" y="${fx(br[1])}" width="${fx(br[0] - bl[0])}" height="${fx(Math.max(0.8, (bl[1] - br[1]) * 0.12))}" fill="${COL.pink}" opacity=".85"/>`;
  const r0 = P(-9.4, 10.4, z), r1 = P(0, 12.4, z), r2 = P(9.4, 10.4, z), r3 = P(0, 11.2, z);
  const roof = `<path d="M${pt(r0)}Q${pt(r1)} ${pt(r2)}L${pt(P(8.2, 10.1, z))}Q${pt(r3)} ${pt(P(-8.2, 10.1, z))}Z" fill="#8a2048"/>`
    + `<circle cx="${fx(r1[0])}" cy="${fx(r1[1] + 3)}" r="${fx(Math.max(4, 1.8 * F / z))}" fill="url(#gPink)"/>`;
  return [posts, beam, roof];
}

// ——— Odległa panorama za końcem ulicy ———
function towerSVG(i) {
  const z = 300 + rnd(i + 70) * 120;
  const xw = (rnd(i + 21) - 0.5) * 120; // jednostki świata, zawęża się do szczeliny nieba
  const w = 9 + rnd(i + 33) * 14;
  const h = 50 + rnd(i + 44) * 90;
  const a = P(xw - w / 2, 0, z), b = P(xw + w / 2, h, z);
  const col = mix('#341a50', '#5a2a7a', rnd(i + 5));
  const edge = COLS[i % COLS.length];
  let dots = '';
  for (let k = 0; k < 6; k++) {
    const dx = a[0] + (b[0] - a[0]) * (0.2 + rnd(i * 7 + k) * 0.6);
    const dy = b[1] + (a[1] - b[1]) * (0.1 + rnd(i * 5 + k * 2) * 0.8);
    dots += `<rect x="${fx(dx)}" y="${fx(dy)}" width="1" height="1.4" fill="#ffd79a" opacity=".85"/>`;
  }
  return {
    d: z,
    svg: `<rect x="${fx(a[0])}" y="${fx(b[1])}" width="${fx(b[0] - a[0])}" height="${fx(a[1] - b[1])}" fill="${col}"/>`
      + `<rect x="${fx(a[0])}" y="${fx(b[1])}" width="${fx(Math.max(0.8, (b[0] - a[0]) * 0.08))}" height="${fx(a[1] - b[1])}" fill="${edge}" opacity=".75"/>${dots}`,
  };
}

const moonSVG = () => `<circle cx="${VPX + 8}" cy="36" r="40" fill="url(#gPink)" opacity=".8"/><circle cx="${VPX + 8}" cy="36" r="11" fill="#ffd6e4"/>`;

// ——— Kolejka kroków ———
const TOTAL = 351;

function build() {
  const items = [];
  let step = -1;
  const add = (d, svg) => { step++; items.push({ step, d, svg }); };
  const also = (d, svg) => items.push({ step, d, svg });

  // 0: niebo, droga, poświata horyzontu
  add(1000, skySVG());
  also(990, groundSVG());
  also(70.5, hazeSVG());

  // 1–24: lampy (od widza ku horyzontowi)
  for (let i = 0; i < 24; i++) { const l = lampSVG(i); add(l.d, l.svg); }

  // 25–36: odległa panorama
  for (let i = 0; i < 12; i++) { const t = towerSVG(i); add(t.d, t.svg); }

  // kwartały: od horyzontu ku widzowi, lewa i prawa strona na przemian
  const blocks = makeBlocks();
  const cellsOf = blocks.map(windowCells);
  const order = [];
  for (let k = 7; k >= 0; k--) {
    order.push(blocks.find((b) => b.k === k && b.side < 0), blocks.find((b) => b.k === k && b.side > 0));
  }
  const strings = 8, lanternsPer = 7, cars = 6, gate = 3, signsPer = 2;
  const fixed = 1 + 24 + 12 + blocks.length + blocks.length * signsPer + strings * lanternsPer + cars + gate + 1;
  const winBudget = TOTAL - fixed;
  const batchOf = (b) => (b.z0 >= 64 ? 4 : b.z0 >= 34 ? 2 : 1);
  const capOf = (b) => Math.ceil(cellsOf[blocks.indexOf(b)].length / batchOf(b));
  const counts = order.map((b) => Math.max(2, Math.min(capOf(b), Math.round((capOf(b) * winBudget) / order.reduce((a, o) => a + capOf(o), 0)))));
  let diff = winBudget - counts.reduce((a, c) => a + c, 0);
  for (let g = 0; diff !== 0 && g < 4000; g++) {
    const n = g % counts.length;
    const cap = capOf(order[n]);
    if (diff > 0 && counts[n] < cap) { counts[n]++; diff--; }
    else if (diff < 0 && counts[n] > 2) { counts[n]--; diff++; }
  }

  const carZ = [95, 76, 58, 47, 31, 24];
  let carN = 0, sign = 0;
  order.forEach((b, n) => {
    const cells = cellsOf[blocks.indexOf(b)];
    add(b.z1 - 0.5, blockSVG(b, cells));
    const batch = b.z0 >= 64 ? 4 : b.z0 >= 34 ? 2 : 1; // dalekie kwartały zapalają kilka okien naraz
    for (let k = 0; k < counts[n]; k++) {
      let svg = '';
      for (let j = 0; j < batch; j++) if (cells[k * batch + j]) svg += winSVG(cells[k * batch + j], b.i * 100 + k * batch + j);
      add(b.z1 - 0.6, svg);
    }
    for (let s = 0; s < signsPer; s++) {
      const sg = signSVG(b, s, [NEON[sign % NEON.length], NEON[(sign * 5 + 3) % NEON.length]], sign);
      sign++;
      if (sg) add(sg.d - 0.2, sg.svg); // za elewacją swojego kwartału, przed bliższymi
      else add(b.z1 - 0.7, '');
    }
    // po parze (prawa strona kończy parę) dodajemy lampiony, samochód i bramę
    if (n % 2 === 1) {
      const k = b.k;
      const zMid = (b.z0 + b.z1) / 2;
      for (let j = 0; j < lanternsPer; j++) {
        add(zMid, (j === 0 ? stringSVG(zMid) : '') + lanternSVG(zMid, j, lanternsPer));
      }
      if (carN < cars && [6, 5, 3, 2, 1, 0].includes(k)) {
        const cz = carZ[carN];
        const c = carSVG(cz, carN % 2 ? 1 : -1, carN);
        add(c.d, c.svg);
        carN++;
      }
      if (k === 3) {
        const gz = 37;
        const [posts, beam, roof] = gateParts(gz);
        add(gz, posts);
        add(gz, beam);
        add(gz, roof);
      }
    }
  });
  while (carN < cars) { const c = carSVG(carZ[carN], carN % 2 ? 1 : -1, carN); add(c.d, c.svg); carN++; }
  add(800, moonSVG());
  return items;
}

let ITEMS = null;
const items = () => (ITEMS ||= build());
export const CITY_STEPS = () => items().length && (items()[items().length - 1].step + 1);

// Procent ukończenia miasta dla danej długości serii.
export function cityPercent(days) {
  return Math.max(0, Math.min(100, Math.floor(((days - CITY_FROM) / CITY_STEPS()) * 100)));
}

export function cityHTML(days) {
  const n = days - CITY_FROM;
  if (n <= 0) return '';
  const vis = items().filter((it) => it.step < n).sort((a, b) => b.d - a.d || a.step - b.step);
  return `<div class="city" aria-hidden="true">
    <svg viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMax meet">
      ${defs}${vis.map((it) => it.svg).join('')}
    </svg>
  </div>`;
}
