// Widoki jako funkcje zwracające HTML. Zdarzenia obsługuje app.js (delegacja po data-act).
import { CHARS, LEVELS, BY_HANZI } from './data.js';
import { state, isKnown, isHard, isVHard, streak, dayStamp, dayStats, overallStats, profileInfo, profileList, whoHas, knownCountOf, hasLegacy, legacyCount, currentId, streakOf, activeTodayOf, peerState, PROFILE_IDS } from './store.js';
import { canSpeak } from './speak.js';
import { syncConfigured, prettyCode } from './sync.js';
import { dueDeck, knownCount, hardCount, hardCharDeck, vhardDeck, customAsItems } from './srs.js';
import { search } from './search.js';
import { wordsWith, searchWords } from './words.js';
import { PASS } from './write.js';
import { toneOf, TONE_LABEL } from './quiz.js';
import { bestSentence } from './sentences.js';
import { FAMILIES, effectiveMode } from './themes.js';

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const svg = (d) =>
  `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ICONS = {
  home: svg('<path d="M12 3l5 7h-3l4 6H6l4-6H7z"/><path d="M12 16v5"/>'),
  known: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>'),
  hard: svg('<path d="M6 21V4"/><path d="M6 5h11l-2.2 4L17 13H6"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  translate: svg('<path d="M3.5 5.5h9M8 3.5v2M5.2 5.5c.6 3.2 2.8 5.6 5.8 7M11 5.5c-.6 3-3 5.8-7 7.5"/><path d="M12.5 20.5l3.6-9 3.6 9M13.9 17.4h4.4"/>'),
  chevron: svg('<path d="M7 10l5 5 5-5"/>'),
  link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  speaker: svg('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
  pencil: svg('<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>'),
  camera: svg('<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  palette: svg('<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-.7-.4-1.2-.4-1.9 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7.5" r="1" fill="currentColor"/>'),
};

export const TABS = [
  ['home', 'Start'],
  ['known', 'Znane'],
  ['hard', 'Trudne'],
];

export function tabbarHTML(active) {
  return TABS.map(
    ([id, label]) =>
      `<a class="tab" href="#/${id}" ${id === active ? 'aria-current="page"' : ''}>${ICONS[id]}<span>${label}</span></a>`
  ).join('');
}

const RANKS = [
  [0, 'Nasionko'], [10, 'Mech'], [50, 'Paproć'], [150, 'Młodnik'], [400, 'Ostoja'], [800, 'Puszcza'], [1500, 'Król lasu'],
];

export function rankInfo(known) {
  let i = 0;
  RANKS.forEach(([min], idx) => { if (known >= min) i = idx; });
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  return {
    name: cur[1],
    next: next ? next[1] : null,
    left: next ? next[0] - known : 0,
    pct: next ? ((known - cur[0]) / (next[0] - cur[0])) * 100 : 100,
  };
}

// ——— Las: im więcej znanych znaków, tym gęstszy drzewostan na horyzoncie ———
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Motywy chińskie: krasowe szczyty (shan shui), pagoda, bambus i chmury w stylu xiangyun.
function pagoda(x, y, sc) {
  let d = '';
  for (let k = 0; k < 3; k++) {
    const y0 = -k * 13;
    const bw = 8 - k * 1.6;
    const rw = 15 - k * 2.4;
    d += `<rect x="${-bw}" y="${y0 - 10}" width="${bw * 2}" height="9"/>`;
    d += `<path d="M${-rw} ${y0 - 12}Q${-bw} ${y0 - 12} 0 ${y0 - 19}Q${bw} ${y0 - 12} ${rw} ${y0 - 12}Q0 ${y0 - 8} ${-rw} ${y0 - 12}Z"/>`;
  }
  d += `<rect x="-13" y="-1" width="26" height="3"/><path d="M0 -45V-55" stroke-width="1.4"/><circle cx="0" cy="-47" r="1.6"/>`;
  return `<g class="pagoda" transform="translate(${x} ${y}) scale(${sc})">${d}</g>`;
}

function bamboo(x, h, lean = 0) {
  const top = 152 - h;
  let d = `<path class="stalk" d="M${x} 152Q${x + lean / 2} ${152 - h / 2} ${x + lean} ${top}"/>`;
  for (let ny = 150 - 14; ny > top; ny -= 14) {
    const t = (152 - ny) / h;
    const nx = x + lean * t * t * 0.9;
    d += `<path class="node" d="M${(nx - 2.2).toFixed(1)} ${ny}h4.4"/>`;
    if (ny < top + 46) {
      d += `<path class="leaf" d="M0 0Q8 -3 17 2Q8 4.5 0 0Z" transform="translate(${nx.toFixed(1)} ${ny}) rotate(${-24 - (ny % 3) * 8})"/>`;
      d += `<path class="leaf" d="M0 0Q-8 -3 -17 2Q-8 4.5 0 0Z" transform="translate(${nx.toFixed(1)} ${ny - 5}) rotate(${22 + (ny % 4) * 6})"/>`;
    }
  }
  return `<g class="bamboo">${d}</g>`;
}

const cloud = (x, y, sc) =>
  `<path class="cloud" transform="translate(${x} ${y}) scale(${sc})" d="M0 9C-7 9-7 0 1 0C1-7 12-8 14-1C19-4 27 0 24 6C30 6 30 12 24 12H4C-2 12-3 9 0 9ZM24 12C32 12 36 8 40 10C43 12 41 17 37 16C35 15.500 35.500 13 37.500 13"/>`;

function forestSVG(known) {
  const n = Math.min(26, 3 + Math.floor(known / 2));
  let trees = '';
  for (let i = 0; i < n; i++) {
    const x = 14 + (332 * (i + rnd(i))) / n;
    const h = 16 + rnd(i + 50) * 20;
    const y = 136 + rnd(i + 9) * 9;
    const w = h * 0.58;
    const pts = [
      [x, y - h], [x + w * 0.38, y - h * 0.5], [x + w * 0.2, y - h * 0.5], [x + w * 0.5, y],
      [x - w * 0.5, y], [x - w * 0.2, y - h * 0.5], [x - w * 0.38, y - h * 0.5],
    ].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
    trees += `<polygon class="${rnd(i + 3) > 0.5 ? 't1' : 't2'}" points="${pts}"/>`;
  }
  return `<svg class="forest" viewBox="0 30 360 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <radialGradient id="halo"><stop class="s-pink" offset="0" stop-opacity=".55"/><stop class="s-pink" offset="1" stop-opacity="0"/></radialGradient>
      <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop class="s-cloud" offset="0" stop-opacity="0"/><stop class="s-cloud" offset=".55" stop-opacity=".16"/><stop class="s-cloud" offset="1" stop-opacity="0"/></linearGradient>
    </defs>
    <circle cx="262" cy="84" r="46" fill="url(#halo)"/><circle class="sun" cx="262" cy="84" r="18"/>
    <circle class="moongate" cx="262" cy="84" r="27"/>
    <path class="karst" d="M0 128V104Q8 100 14 84Q18 70 26 66Q34 64 38 80Q42 96 54 100Q60 80 66 62Q72 48 80 50Q88 54 90 72Q94 96 108 104Q122 100 130 88Q138 76 146 82Q152 92 156 104L170 112Q196 108 206 94Q214 82 222 86Q230 92 232 104Q246 112 262 106Q272 100 276 88Q282 70 292 66Q300 64 304 82Q308 100 322 106Q340 104 352 92L360 88V128Z"/>
    <rect x="0" y="86" width="360" height="40" fill="url(#mist)"/>
    ${cloud(236, 60, 0.8)}${cloud(318, 100, 0.55)}${cloud(150, 118, 0.5)}
    <path class="ridge-back" d="M0 118C40 92 82 108 124 94S204 78 252 98S330 90 360 102V180H0Z"/>
    ${pagoda(167, 85, 0.62)}
    ${trees}
    ${bamboo(334, 86, 5)}${bamboo(343, 70, -2)}${bamboo(351, 92, 4)}${bamboo(14, 58, 3)}${bamboo(22, 44, -2)}
    <path class="ridge-front" d="M0 152C60 136 112 150 172 140S292 128 360 144V180H0Z"/>
  </svg>`;
}

const chip = (label, active, act, data = '') =>
  `<button class="chip" type="button" data-act="${act}" ${data} aria-pressed="${active}">${label}</button>`;

// Znaki „mityczne” (stopa, jeleń): opalizująca obwódka, złota aura i iskry na kafelku i fiszce.
export const MYTHIC = new Set(['足', '脚', '鹿']);
const sparks = (n) => Array.from({ length: n }, (_, i) => `<i class="spark s${i + 1}" aria-hidden="true"></i>`).join('');
// „Bardzo trudne”: karmazynowy żar z iskrami. Znak mityczny zachowuje swoją poświatę i dostaje tylko znaczek w rogu.
const embers = (n) => Array.from({ length: n }, (_, i) => `<i class="ember-up e${i + 1}" aria-hidden="true"></i>`).join('');
export function glowOf(h, n) {
  const vh = isVHard(h);
  if (MYTHIC.has(h)) return { cls: ' mythic', html: sparks(n) + (vh ? '<i class="vh-badge" aria-hidden="true"></i>' : '') };
  if (vh) return { cls: ' vhard', html: embers(n + 1) };
  return { cls: '', html: '' };
}

const tile = (c, locked = false) => {
  const g = glowOf(c.hanzi, 2);
  return `<button class="tile${isHard(c.hanzi) ? ' is-hard' : isKnown(c.hanzi) ? ' is-known' : ''}${locked ? ' is-locked' : ''}${g.cls}" type="button" data-act="open" data-h="${esc(c.hanzi)}"${isVHard(c.hanzi) ? ' aria-description="bardzo trudny"' : ''}>
    <span class="hz">${esc(c.hanzi)}</span><span class="py">${esc(c.pinyin)}</span>${g.html}
  </button>`;
};

const header = (title, right = '') => `<header class="top"><h1>${title}</h1><div class="top-actions">${right}</div></header>`;

// ——— Seria: lampiony zapalają się dzień po dniu ———
const dayWord = (n) => (n === 1 ? 'dzień' : 'dni');

// Lampion (wspólny kształt): współrzędne lokalne, początek na środku zawieszenia.
// lit = zapalony: różowy korpus, jasne wnętrze i poświata; zgaszony: ciemny obrys.
function lampion(x, y, sc, lit, i) {
  // Kolory przez klasy i zmienne CSS (--lamp*), żeby lampiony zmieniały się wraz z motywem; stan świecenia to klasa .lit.
  const glow = lit ? `<circle class="lamp-halo" cx="0" cy="21" r="24" fill="url(#lampGlow)" style="--d:${(i * 0.37).toFixed(2)}s"/>` : '';
  const body = lit
    ? '<ellipse class="lp-body" cx="0" cy="18" rx="11" ry="12"/><ellipse class="lp-hi" cx="0" cy="18" rx="6.2" ry="8.4" opacity=".9"/>'
    : '<ellipse class="lp-off" cx="0" cy="18" rx="11" ry="12" stroke-width="1.2"/>';
  return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="lamp${lit ? ' lit' : ''}" style="--d:${(i * 0.45).toFixed(2)}s">
    ${glow}
    <path class="lp-cap-s" d="M0 -6V3" stroke-width="1" fill="none"/>
    ${body}
    <path class="lp-rib" d="M0 6V30M-6.2 7Q-9.8 18-6.2 29M6.2 7Q9.8 18 6.2 29" stroke-width=".9" fill="none"/>
    <rect class="lp-cap" x="-6" y="3" width="12" height="3.2" rx="1.2"/><rect class="lp-cap" x="-5" y="29.5" width="10" height="3.2" rx="1.2"/>
    <path class="lp-tassel" d="M0 32.7V39" stroke-width="1.1"/><circle class="lp-bead" cx="0" cy="40" r="1.5"/>
  </g></g>`;
}

// Girlanda: dwa sznury na całą szerokość kafla, w lekkiej perspektywie (patrzymy w górę wzdłuż ulicy, punkt zbiegu pod kafelkiem).
// Sznur 1 (dni 1–7) jest bliżej, sznur 2 (dni 8–14) dalej, więc jest odrobinę węższy, niżej i z mniejszymi lampionami.
// Sznur rozciąga się z kontenerem (SVG bez proporcji), lampiony mają stały rozmiar w px i stoją w procentach szerokości.
// Zapalone lampiony to dni serii, ciemne to cel na kolejne dni. Od 14 dni dochodzą migoczące iskry.
const PER = 7, G = 1.12, VPX = 52, VPY = 472, Y0 = 5, A0 = 54;
const GARLAND_H1 = 62, GARLAND_H2 = 102;
export const garlandHeight = (days) => (days > 7 ? GARLAND_H2 : GARLAND_H1);

function rowGeom(r) {
  const sd = Math.pow(G, -r);
  const y = VPY - (VPY - Y0) * sd;
  return { y, sag: 9 * sd, sc: 0.92 * sd, xAt: (u) => VPX + (50 - VPX + u * A0) * sd };
}

function garlandHTML(days) {
  const h = garlandHeight(days);
  const rows = [{ r: 0, lit: Math.min(days, PER) }];
  if (days > 7) rows.push({ r: 1, lit: Math.min(days - 7, PER) });
  let cords = '', lamps = '';
  for (const row of rows.slice().reverse()) { // dalszy sznur najpierw, żeby bliższy go zasłaniał
    const { y, sag, sc, xAt } = rowGeom(row.r);
    cords += `<path class="cord" d="M${xAt(-1).toFixed(2)} ${y.toFixed(1)}Q${xAt(0).toFixed(2)} ${(y + 2 * sag).toFixed(1)} ${xAt(1).toFixed(2)} ${y.toFixed(1)}" fill="none" vector-effect="non-scaling-stroke"/>`;
    for (let k = 0; k < PER; k++) {
      const t = (k + 0.5 + (row.r % 2) * 0.5) / (PER + (row.r % 2 ? 1 : 0));
      const ly = y + 2 * sag * t * (1 - t) + 1;
      const w = 28 * sc;
      lamps += `<svg class="lamp-box" style="left:${xAt(t * 2 - 1).toFixed(2)}%;top:${(ly - 8 * sc).toFixed(1)}px;width:${w.toFixed(1)}px;height:${(52 * sc).toFixed(1)}px;margin-left:${(-w / 2).toFixed(1)}px" viewBox="-14 -8 28 52" overflow="visible">${lampion(0, 0, 1, k < row.lit, row.r * PER + k)}</svg>`;
    }
  }
  const sparks = days >= 14 ? Array.from({ length: 9 }, (_, i) =>
    `<i class="ember" style="--x:${(4 + ((i * 53) % 92)).toFixed(0)}%;--y:${(14 + ((i * 37) % 70)).toFixed(0)}%;--d:${((i * 0.41) % 2.4).toFixed(2)}s"></i>`).join('') : '';
  return `<div class="garland" aria-hidden="true" style="height:${h}px">
    <svg class="cord-svg" viewBox="0 0 100 ${h}" preserveAspectRatio="none" overflow="visible">
      <defs><radialGradient id="lampGlow"><stop class="s-glow" offset="0" stop-opacity=".62"/><stop class="s-glow" offset="1" stop-opacity="0"/></radialGradient></defs>
      ${cords}
    </svg>${lamps}${sparks}
  </div>`;
}

// Stan rozwinięcia sekcji „Kalendarz i statystyki” (domyślnie zwinięta; pamiętany do końca sesji).
let statsOpen = false;
export const setStatsOpen = (v) => { statsOpen = v; };

function streakTile(days, doneToday) {
  const tier = days === 0 ? 0 : days < 3 ? 1 : days < 7 ? 2 : days < 14 ? 3 : 4;
  const note = days === 0
    ? 'Zrób dziś jedną powtórkę, żeby zapalić pierwszy lampion.'
    : doneToday ? 'Dzisiejsza powtórka zaliczona.' : 'Ćwicz dziś, żeby nie zgasł lampion.';
  return `<section class="streak-card${statsOpen ? ' is-open' : ''}" data-tier="${tier}" aria-label="Seria i statystyki nauki">
    <div class="streak" data-tier="${tier}" style="--gh:${garlandHeight(days)}px" role="group" aria-label="Seria: ${days} ${dayWord(days)}">
      ${garlandHTML(days)}
      <div class="streak-text"><b>${days}</b><span>${dayWord(days)} serii</span><small>${note}</small></div>
    </div>
    <button class="streak-toggle" type="button" data-act="toggle-stats" aria-expanded="${statsOpen}" aria-controls="streak-more">
      <span>Kalendarz i statystyki</span>
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="streak-more" id="streak-more"><div class="streak-more-in"${statsOpen ? '' : ' inert'}>
      ${calendarHTML()}
      ${overallHTML()}
    </div></div>
  </section>`;
}

// ——— Kalendarz nauki (jak na GitHubie) i statystyki ogółem ———
const plural = (n, one, few, many) => (n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many);
export const cardsWord = (n) => `${n} ${plural(n, 'karta', 'karty', 'kart')}`;

export function fmtTime(ms) {
  const min = Math.round(ms / 60000);
  if (ms > 0 && min < 1) return '<1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
}

const WEEKS = 18;
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const level = (r) => (r === 0 ? 0 : r < 5 ? 1 : r < 15 ? 2 : r < 30 ? 3 : 4);

// Opis dnia pod kalendarzem; offset 0 = dziś.
export function dayDetail(key) {
  const d = dayStats(key);
  const [y, m, dd] = key.split('-').map(Number);
  const label = key === dayStamp()
    ? 'Dziś'
    : new Date(y, m - 1, dd).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
  return d.r || d.t
    ? `<b>${label}</b>: ${cardsWord(d.r)}${d.t ? `, ${fmtTime(d.t)}` : ''}`
    : `<b>${label}</b>: bez nauki`;
}

function calendarHTML() {
  const today = dayStamp();
  const dow = (new Date().getDay() + 6) % 7; // poniedziałek = 0
  const cols = [];
  let prevMonth = -1;
  for (let c = 0; c < WEEKS; c++) {
    const mondayKey = dayStamp((c - (WEEKS - 1)) * 7 - dow);
    const month = Number(mondayKey.slice(5, 7)) - 1;
    cols.push(month !== prevMonth ? `<span class="cal-m" style="grid-column:${c + 2}">${MONTHS[month]}</span>` : '');
    prevMonth = month;
  }
  const cells = [];
  for (let r = 0; r < 7; r++) {
    cells.push(`<span class="cal-w">${['Pn', '', 'Śr', '', 'Pt', '', ''][r]}</span>`);
    for (let c = 0; c < WEEKS; c++) {
      const off = (c - (WEEKS - 1)) * 7 + (r - dow);
      if (off > 0) { cells.push('<i class="cal-c future"></i>'); continue; }
      const key = dayStamp(off);
      const d = dayStats(key);
      cells.push(`<button type="button" class="cal-c l${level(d.r)}${key === today ? ' today sel' : ''}" data-act="cal-day" data-d="${key}" aria-label="${key}: ${cardsWord(d.r)}"></button>`);
    }
  }
  return `<div class="cal" role="group" aria-label="Kalendarz nauki">
    <div class="cal-months cal-cols" aria-hidden="true">${cols.join('')}</div>
    <div class="cal-grid cal-cols">${cells.join('')}</div>
    <p class="cal-detail" aria-live="polite">${dayDetail(today)}</p>
    <p class="cal-legend" aria-hidden="true"><span>mniej</span><i class="cal-c l0"></i><i class="cal-c l1"></i><i class="cal-c l2"></i><i class="cal-c l3"></i><i class="cal-c l4"></i><span>więcej</span></p>
  </div>`;
}

function overallHTML() {
  const o = overallStats();
  const retention = o.g ? `${Math.round((o.ok / o.g) * 100)}%` : '—';
  const item = (v, l) => `<div><b>${v}</b><span>${l}</span></div>`;
  return `<div class="overall" role="group" aria-label="Ogółem">
    <h3>Ogółem</h3>
    <div class="overall-grid">
      ${item(fmtTime(o.t), 'czas nauki')}
      ${item(o.days, plural(o.days, 'dzień nauki', 'dni nauki', 'dni nauki'))}
      ${item(retention, 'retencja')}
      ${item(o.r, plural(o.r, 'powtórka', 'powtórki', 'powtórek'))}
    </div>
    <p class="overall-note">Retencja to odsetek poprawnych odpowiedzi w powtórkach i quizach.</p>
  </div>`;
}

// ——— Start: postęp, seria i poziomy HSK z listą wszystkich znaków ———
export function nextLearnLevel() {
  return LEVELS.find((l) => CHARS.some((c) => c.hsk === l.n && !isKnown(c.hanzi)))?.n ?? null;
}

// Zawartość listy rozwijanej poziomu (renderowana dopiero po otwarciu): znane znaki na różowo.
export function tierBodyHTML(n) {
  const list = CHARS.filter((c) => c.hsk === n);
  const todo = list.filter((c) => !isKnown(c.hanzi)).length;
  return `<div class="grid">${list.map((c) => tile(c)).join('')}</div>
    ${todo
      ? `<div class="btn-row"><button class="btn small" type="button" data-act="learn-open" data-lv="${n}">Ucz się nieznanych (${todo})</button></div>`
      : '<p class="hint">Wszystkie znaki z tego poziomu są już znane.</p>'}`;
}

export function homeView(ui) {
  const known = knownCount();
  const total = CHARS.length;
  const r = rankInfo(known);
  const due = dueDeck().length;
  const st = streak();
  const next = nextLearnLevel();

  const ctas = [
    due > 0 ? `<button class="btn primary" data-act="study-due">Powtórka na dziś (${due})</button>` : '',
    next ? `<button class="btn${due > 0 ? '' : ' primary'}" data-act="learn-open" data-lv="${next}">Ucz się nowych znaków</button>` : '',
  ].join('');

  const levels = LEVELS.map((lv) => {
    const all = CHARS.filter((c) => c.hsk === lv.n).length;
    if (!all) return '';
    const k = knownCount(lv.n);
    const open = ui.openTiers.has(lv.n);
    return `<details class="tier" data-lv="${lv.n}" ${open ? 'open' : ''}>
      <summary>
        <span class="tier-head"><b>${lv.label}</b><span class="tier-count">${k}/${all}</span><span class="chev">${ICONS.chevron}</span></span>
        <span class="bar${k === all ? ' full' : ''}" role="progressbar" aria-label="${lv.label}" aria-valuemin="0" aria-valuemax="${all}" aria-valuenow="${k}"><i style="width:${(k / all) * 100}%"></i></span>
      </summary>
      <div class="tier-body">${open ? tierBodyHTML(lv.n) : ''}</div>
    </details>`;
  }).join('');

  return `
    <h1 class="sr-only">BotHanzi</h1>
    <section class="hero">
      ${forestSVG(known)}
      <div class="hero-text">
        <p class="hero-rank">${r.name}</p>
        <p class="hero-sub">${known} z ${total} znaków</p>
        <div class="bar on-dark" role="progressbar" aria-label="Postęp do kolejnej rangi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(r.pct)}"><i style="width:${r.pct}%"></i></div>
        <p class="hero-next">${r.next ? `${r.left} do rangi „${r.next}”` : 'Najwyższa ranga osiągnięta'}</p>
      </div>
    </section>
    ${ctas ? `<div class="cta-row">${ctas}</div>` : ''}
    ${weekCardHTML()}
    <section class="stats" aria-label="Statystyki">
      <div class="stat"><b>${known}</b><span>znane</span></div>
      <div class="stat"><b>${due}</b><span>do powtórki</span></div>
    </section>
    ${streakTile(st, Boolean(state.activity[dayStamp()]))}
    <section>
      <h2>Poziomy HSK</h2>
      <div class="levels">${levels}</div>
    </section>`;
}

// ——— Znane ———
export const QUIZ_SIZES = ['10', '30', '50', 'custom'];
export const QUIZ_MODES = [['text', 'Pisemny'], ['listen', 'Ze słuchu'], ['write', 'Pisanie']];
const QUIZ_START = { text: 'Zacznij quiz', listen: 'Zacznij słuchanie', write: 'Zacznij pisanie' };
const LISTEN_CHIPS = [['mix', 'Mieszane'], ['py', 'Pinyin'], ['hz', 'Znak'], ['pl', 'Znaczenie']];

export function quizCount(ui) {
  const kc = knownCount();
  if (!kc) return 0;
  if (ui.quizSize === 'custom') return Math.min(kc, Math.max(1, parseInt(ui.quizCustom, 10) || 1));
  return Math.min(kc, Number(ui.quizSize));
}

export function knownGridHTML(ui) {
  let list = ui.knownQuery.trim()
    ? search(ui.knownQuery).filter((c) => isKnown(c.hanzi))
    : CHARS.filter((c) => isKnown(c.hanzi));
  if (ui.knownLevel) list = list.filter((c) => c.hsk === ui.knownLevel);
  if (!list.length) {
    return `<div class="empty small"><p>${ui.knownQuery.trim() ? `Wśród znanych nie ma wyników dla „${esc(ui.knownQuery)}”.` : 'Brak znanych znaków na tym poziomie.'}</p></div>`;
  }
  return `<div class="grid">${list.map((c) => tile(c)).join('')}</div>`;
}

export function knownView(ui) {
  const kc = knownCount();
  const levels = LEVELS.filter((l) => knownCount(l.n) > 0);
  const chips = [chip('Wszystkie', !ui.knownLevel, 'known-level', 'data-lv="0"'),
    ...levels.map((l) => chip(l.label, ui.knownLevel === l.n, 'known-level', `data-lv="${l.n}"`))].join('');

  if (!kc) {
    return `${header('Znane znaki')}
      <div class="empty"><p>Tu pojawią się znaki, które już znasz.</p><a class="btn" href="#/home">Wróć na Start</a></div>`;
  }

  const sizeChips = QUIZ_SIZES.map((n) =>
    chip(n === 'custom' ? 'Własna' : n, ui.quizSize === n, 'quiz-size', `data-n="${n}"`)).join('');

  const lupa = `<button class="icon-btn${ui.knownSearchOpen ? ' on' : ''}" type="button" data-act="known-search" aria-pressed="${ui.knownSearchOpen}" aria-label="Szukaj wśród znanych">${ICONS.search}</button>`;

  return `${header('Znane znaki', `<span class="count">${kc}</span>${lupa}`)}
    ${ui.knownSearchOpen ? `<div class="searchbox inline">${ICONS.search}
      <input id="kq" type="search" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="Szukaj wśród znanych" value="${esc(ui.knownQuery)}" aria-label="Szukaj wśród znanych znaków"></div>` : ''}
    <section class="panel quiz-setup">
      <h2>Odpytaj się</h2>
      <div class="chips" role="group" aria-label="Rodzaj quizu">${QUIZ_MODES.map(([m, l]) => chip(l, ui.quizMode === m, 'quiz-mode', `data-m="${m}"`)).join('')}</div>
      ${ui.quizMode === 'listen' ? `<div class="chips" role="group" aria-label="Rodzaj pytań">${LISTEN_CHIPS.map(([m, l]) => chip(l, ui.listenType === m, 'listen-type', `data-m="${m}"`)).join('')}</div>` : ''}
      <div class="chips" role="group" aria-label="Liczba znaków w quizie">${sizeChips}</div>
      ${ui.quizSize === 'custom' ? `<label class="num">Liczba znaków (1–${kc})
        <input id="quiz-n" type="number" inputmode="numeric" min="1" max="${kc}" value="${esc(ui.quizCustom)}"></label>` : ''}
      <div class="btn-row"><button class="btn primary" type="button" data-act="start-quiz">${QUIZ_START[ui.quizMode]} (${quizCount(ui)})</button></div>
    </section>
    <div class="chips" role="group" aria-label="Filtr poziomu">${chips}</div>
    <div id="known-grid">${knownGridHTML(ui)}</div>`;
}

// ——— Trudne: znaki oznaczone jako trudne (jak „Znane”), ćwiczenie fiszkami i własne fiszki ———
export function hardGridHTML(ui) {
  let list = ui.hardQuery.trim()
    ? search(ui.hardQuery).filter((c) => isHard(c.hanzi))
    : CHARS.filter((c) => isHard(c.hanzi));
  if (ui.hardLevel) list = list.filter((c) => c.hsk === ui.hardLevel);
  list = [...list.filter((c) => isVHard(c.hanzi)), ...list.filter((c) => !isVHard(c.hanzi))]; // bardzo trudne na początku
  if (!list.length) {
    return `<div class="empty small"><p>${ui.hardQuery.trim() ? `Wśród trudnych nie ma wyników dla „${esc(ui.hardQuery)}”.` : 'Brak trudnych znaków na tym poziomie.'}</p></div>`;
  }
  return `<div class="grid">${list.map((c) => tile(c)).join('')}</div>`;
}

export const HARD_MODES = [['cards', 'Fiszki'], ['listen', 'Ze słuchu'], ['write', 'Pisanie']];
// Liczba kart w ćwiczeniu trudnych: Wszystkie / 10 / 30 / 50 / Własna (jak w „Odpytaj się”).
export const HARD_SIZES = ['all', '10', '30', '50', 'custom'];
export function hardCap(ui, n) {
  if (!n || ui.hardSize === 'all') return n;
  const k = ui.hardSize === 'custom' ? Math.max(1, parseInt(ui.hardCustom, 10) || 1) : Number(ui.hardSize);
  return Math.min(n, k);
}
export const hardLabel = (ui, vh, n) => `${vh ? 'Ćwicz b. trudne' : 'Ćwicz trudne'} (${hardCap(ui, n)})`;
const VHARD_START = { cards: 'Ćwicz b. trudne', listen: 'Ćwicz b. trudne', write: 'Ćwicz b. trudne' };
const HARD_START = { cards: 'Ćwicz trudne', listen: 'Ćwicz trudne', write: 'Ćwicz trudne' }; // tryb widać na chipie

export function hardView(ui) {
  const hardChars = CHARS.filter((c) => isHard(c.hanzi));
  const custom = customAsItems();
  const mode = ui.hardMode || 'cards';
  const total = mode === 'cards' ? hardCount() : hardCharDeck().length; // fiszki: trudne + własne; słuch/pisanie: tylko znaki z bazy
  const levels = LEVELS.filter((l) => hardChars.some((c) => c.hsk === l.n));
  const chips = [chip('Wszystkie', !ui.hardLevel, 'hard-level', 'data-lv="0"'),
    ...levels.map((l) => chip(l.label, ui.hardLevel === l.n, 'hard-level', `data-lv="${l.n}"`))].join('');
  const lupa = `<button class="icon-btn${ui.hardSearchOpen ? ' on' : ''}" type="button" data-act="hard-search" aria-pressed="${ui.hardSearchOpen}" aria-label="Szukaj wśród trudnych">${ICONS.search}</button>`;

  const customList = custom.map((c) => `<li class="row"><div class="row-main"><span class="hz-sm">${esc(c.hanzi)}</span><span><b>${esc(c.pinyin)}</b><small>${esc(c.pl || c.en)}</small></span></div>
      <button class="icon-btn" data-act="del-custom" data-id="${esc(c.key.slice(2))}" aria-label="Usuń fiszkę ${esc(c.hanzi)}">${ICONS.close}</button></li>`).join('');

  return `${header('Trudne znaki', `<span class="count">${hardChars.length}</span>${hardChars.length ? lupa : ''}`)}
    ${ui.hardSearchOpen && hardChars.length ? `<div class="searchbox inline">${ICONS.search}
      <input id="hq" type="search" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="Szukaj wśród trudnych" value="${esc(ui.hardQuery)}" aria-label="Szukaj wśród trudnych znaków"></div>` : ''}
    <section class="panel quiz-setup">
      <h2>Ćwicz trudne</h2>
      <div class="chips" role="group" aria-label="Rodzaj ćwiczenia">${HARD_MODES.map(([m, l]) => chip(l, mode === m, 'hard-mode', `data-m="${m}"`)).join('')}</div>
      ${mode === 'listen' ? `<div class="chips" role="group" aria-label="Rodzaj pytań">${LISTEN_CHIPS.map(([m, l]) => chip(l, ui.listenType === m, 'listen-type', `data-m="${m}"`)).join('')}</div>` : ''}
      <div class="chips" role="group" aria-label="Liczba kart">${HARD_SIZES.map((n) => chip(n === 'all' ? 'Wszystkie' : n === 'custom' ? 'Własna' : n, ui.hardSize === n, 'hard-size', `data-n="${n}"`)).join('')}</div>
      ${ui.hardSize === 'custom' ? `<label class="num">Liczba kart (1–${total})
        <input id="hard-n" type="number" inputmode="numeric" min="1" max="${total}" value="${esc(ui.hardCustom)}"></label>` : ''}
      <div class="btn-row"><button class="btn primary" type="button" data-act="study-hard" ${total ? '' : 'disabled'}>${total ? hardLabel(ui, false, total) : 'Brak trudnych znaków'}</button>${vhardDeck().length ? `<button class="btn primary vh-btn" type="button" data-act="study-vhard">${hardLabel(ui, true, vhardDeck().length)}</button>` : ''}</div>
    </section>
    ${hardChars.length
      ? `<div class="chips" role="group" aria-label="Filtr poziomu">${chips}</div><div id="hard-grid">${hardGridHTML(ui)}</div>`
      : '<div class="empty small"><p>Tu pojawią się znaki, które sprawiają Ci kłopot. Otwórz dowolny znak i wybierz „Dodaj do trudnych”.</p></div>'}
    <section class="panel">
      <h2>Własne fiszki</h2>
      ${custom.length ? `<ul class="rows">${customList}</ul>` : ''}
      <div class="btn-row"><button class="btn" type="button" data-act="new-card">${ICONS.plus}Własna fiszka</button></div>
    </section>`;
}

// ——— „Ucz się nowych”: wybór liczby znaków (5 / 10 / 15 / własna) ———
export const LEARN_SIZES = ['5', '10', '15', 'custom'];

export function learnTodo(lv) { return CHARS.filter((c) => c.hsk === lv && !isKnown(c.hanzi)).length; }

export function learnCount(lv) {
  const todo = learnTodo(lv);
  const p = state.learnPref || { size: '10', custom: 12 };
  const n = p.size === 'custom' ? parseInt(p.custom, 10) || 1 : Number(p.size);
  return Math.min(todo, Math.max(1, n));
}

export function learnSheetView(lv) {
  const todo = learnTodo(lv);
  const p = state.learnPref || { size: '10', custom: 12 };
  const label = LEVELS.find((l) => l.n === lv)?.label || `HSK ${lv}`;
  const chips = LEARN_SIZES.map((n) => chip(n === 'custom' ? 'Własna' : n, p.size === n, 'learn-size', `data-n="${n}"`)).join('');
  return `<div class="sheet-backdrop" data-act="close-sheet"></div>
    <section class="sheet sheet-learn" role="dialog" aria-modal="true" aria-label="Ucz się nowych znaków">
      <div class="grab" aria-hidden="true"></div>
      <h2>Ucz się nowych znaków</h2>
      <p class="muted">${label}: zostało ${todo} ${plural(todo, 'nieznany znak', 'nieznane znaki', 'nieznanych znaków')}. Ile chcesz się teraz nauczyć?</p>
      <div class="chips learn-chips" role="group" aria-label="Liczba znaków">${chips}</div>
      ${p.size === 'custom' ? `<label class="num">Liczba znaków (1–${todo})
        <input id="learn-n" type="number" inputmode="numeric" min="1" max="${todo}" value="${esc(p.custom)}"></label>` : ''}
      <div class="btn-col">
        <button class="btn primary" type="button" id="learn-go" data-act="learn-go" data-lv="${lv}">Zacznij (${learnCount(lv)})</button>
        <button class="btn" type="button" data-act="close-sheet">Anuluj</button>
      </div>
    </section>`;
}

// ——— Wyniki wyszukiwania (panel pod górnym paskiem) ———
// Wiersz słowa: dotknięcie otwiera kartę słowa, osobny przycisk czyta słowo na głos.
export const wordRowHTML = (x) => `<li class="row"><button class="row-main" type="button" data-act="open-word" data-w="${esc(x.w)}">
    <span class="hz-w" lang="zh">${esc(x.w)}</span>
    <span><b>${esc(x.pinyin)}</b><small>${esc(x.pl)} · ${esc(x.en)}</small></span>
  </button>${speakBtn(x.w)}</li>`;

export function resultsHTML(list, query) {
  if (!query.trim()) return '';
  const words = searchWords(query);
  if (!list.length && !words.length) {
    return `<div class="empty small"><p>Brak wyników dla „${esc(query)}”. Spróbuj krótszej frazy albo innego języka.</p></div>`;
  }
  const n = list.length + words.length;
  const chars = list.length ? `<ul class="rows">${list.map((c) => `<li class="row"><button class="row-main" data-act="open" data-h="${esc(c.hanzi)}">
      <span class="hz-sm">${esc(c.hanzi)}</span>
      <span><b>${esc(c.pinyin)}</b><small>${esc(c.pl)} · ${esc(c.en)}</small></span>
      ${isKnown(c.hanzi) ? '<i class="dot" title="Znany"></i>' : ''}
    </button></li>`).join('')}</ul>` : '';
  const ws = words.length ? `<h3 class="res-h">Słowa (${words.length})</h3><ul class="rows">${words.map(wordRowHTML).join('')}</ul>` : '';
  return `<p class="muted count-line">${n} ${n === 1 ? 'wynik' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'wyniki' : 'wyników'}</p>${chars}${ws}`;
}

// Słowa zawierające znak (w karcie znaku).
export function wordsSectionHTML(hanzi) {
  const list = wordsWith(hanzi);
  if (!list.length) return '';
  return `<section class="words" aria-label="Słowa z tym znakiem"><h3 class="res-h">Słowa z tym znakiem</h3>
    <ul class="rows">${list.slice(0, 8).map(wordRowHTML).join('')}</ul>
    ${list.length > 8 ? `<p class="muted words-more">i ${list.length - 8} więcej: wpisz znak w wyszukiwarce</p>` : ''}</section>`;
}

export function wordSheetView(x) {
  const lv = LEVELS.find((l) => l.n === x.hsk);
  const chars = [...new Set(x.w)].map((h) => BY_HANZI.get(h)).filter(Boolean);
  return `<div class="sheet-backdrop" data-act="close-sheet"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="Słowo ${esc(x.w)}">
      <div class="grab" aria-hidden="true"></div>
      <p class="word-hz" lang="zh">${esc(x.w)}</p>
      <p class="sheet-py">${esc(x.pinyin)}${speakBtn(x.w)}</p>
      <div class="sheet-meta"><p class="pill">${lv ? lv.label : ''}</p></div>
      <dl class="meanings"><div><dt>Polski</dt><dd>${esc(x.pl)}</dd></div><div><dt>English</dt><dd>${esc(x.en)}</dd></div></dl>
      <h3 class="res-h">Znaki w tym słowie</h3>
      <div class="grid word-chars">${chars.map((c) => tile(c)).join('')}</div>
      <div class="btn-col"><button class="btn" type="button" data-act="close-sheet">Zamknij</button></div>
    </section>`;
}

// ——— Zdanie przykładowe: znak pogrubiony na różowo, nieznane znaki z bazy przyciemnione ———
export function sentenceHTML(hanzi) {
  const st = bestSentence(hanzi);
  if (!st) return '';
  let hasUnknown = false;
  const zh = [...st.zh].map((ch) => {
    if (ch === hanzi) return `<mark class="s-t">${esc(ch)}</mark>`;
    if (BY_HANZI.has(ch) && !isKnown(ch)) { hasUnknown = true; return `<span class="s-u">${esc(ch)}</span>`; }
    return esc(ch);
  }).join('');
  const on = state.showTr;
  return `<div class="sentence${on ? ' show-tr' : ''}">
    ${speakBtn(st.zh)}
    <button class="tr-btn" type="button" data-act="toggle-tr" aria-pressed="${on}" aria-label="Pokaż tłumaczenie zdania" title="Tłumaczenie">${ICONS.translate}</button>
    <p class="s-zh" lang="zh">${zh}</p>
    <p class="s-py">${esc(st.py)}</p>
    <p class="s-pl">${esc(st.pl)}</p>
    ${hasUnknown ? '<p class="s-note">Przyciemnione znaki jeszcze nie są znane.</p>' : ''}
  </div>`;
}

// Przycisk wymowy (Web Speech API); bez obsługi syntezy mowy w ogóle się nie pokazuje.
export const speakBtn = (text) => (canSpeak
  ? `<button class="speak-btn" type="button" data-act="speak" data-t="${esc(text)}" aria-label="Posłuchaj wymowy: ${esc(text)}">${ICONS.speaker}</button>` : '');

// ——— Ostatnie 7 dni: Ty i druga osoba (lampiony = dni z nauką) ———
const WEEKDAY = ['N', 'P', 'W', 'Ś', 'C', 'P', 'S'];
const miniLamp = (lit, i) => `<svg class="ml" viewBox="-12 -4 24 46" aria-hidden="true"><g class="lamp${lit ? ' lit' : ''}" style="--d:${(i * 0.4).toFixed(1)}s">${lit
  ? '<ellipse class="lp-body" cx="0" cy="18" rx="11" ry="12"/><ellipse class="lp-hi" cx="0" cy="18" rx="6.2" ry="8.4" opacity=".9"/>'
  : '<ellipse class="lp-off" cx="0" cy="18" rx="11" ry="12" stroke-width="1.4"/>'}<path class="lp-rib" d="M0 6V30M-6.2 7Q-9.8 18-6.2 29M6.2 7Q9.8 18 6.2 29" stroke-width="1" fill="none"/><rect class="lp-cap" x="-6" y="3" width="12" height="3.2" rx="1.2"/><rect class="lp-cap" x="-5" y="29.5" width="10" height="3.2" rx="1.2"/><path class="lp-tassel" d="M0 32.7V39" stroke-width="1.2"/><circle class="lp-bead" cx="0" cy="40" r="1.6"/></g></svg>`;

function weekRow(id) {
  const act = peerState(id).activity || {};
  const p = profileInfo(id);
  const n = streakOf(id);
  const today = act[dayStamp()] || 0;
  const lamps = [...Array(7)].map((_, k) => {
    const off = k - 6;
    const d = new Date();
    d.setDate(d.getDate() + off);
    return `<span class="mc${off === 0 ? ' today' : ''}">${miniLamp(Boolean(act[dayStamp(off)]), k)}<small>${WEEKDAY[d.getDay()]}</small></span>`;
  }).join('');
  const todayTxt = today ? `dziś: ${today} ${plural(today, 'karta', 'karty', 'kart')}` : 'dziś: brak';
  return `<div class="mrow" role="group" aria-label="${esc(p.name)}: seria ${n} ${dayWord(n)}, ${todayTxt}">
    ${avatarHTML(id, 'md')}<div class="mname"><b>${esc(p.name)}</b><small>${todayTxt}</small></div>
    <div class="mlamps">${lamps}</div><div class="mn"><b>${n}</b><small>${dayWord(n)}</small></div></div>`;
}

export function weekCardHTML() {
  const me = currentId();
  const other = PROFILE_IDS.find((id) => id !== me);
  if (!me || !other) return '';
  return `<section class="week" aria-label="Ostatnie 7 dni">${weekRow(me)}${weekRow(other)}</section>`;
}

// ——— Profile: awatary, kto ma znak, ekran wyboru, edycja, synchronizacja ———
export function avatarHTML(id, size = 'md') {
  const p = profileInfo(id);
  const inner = p.avatar
    ? `<img src="${esc(p.avatar)}" alt="" draggable="false">`
    : `<span aria-hidden="true">${esc([...p.name][0]?.toUpperCase() || '?')}</span>`;
  return `<span class="av av-${size}" data-p="${id}">${inner}</span>`;
}

// Małe awatary osób, które mają znak w „Znanych”; czerwona obwódka, gdy jest w ich „Trudnych”.
export function whoHTML(hanzi, cls = '') {
  const list = whoHas(hanzi);
  if (!list.length) return '';
  const label = list.map((p) => `${p.name}: ${p.hard ? 'trudny' : 'znany'}`).join(', ');
  return `<span class="who ${cls}" role="img" aria-label="${esc(label)}">${list.map((p) =>
    `<span class="who-i ${p.hard ? 'is-hard' : 'is-known'}" title="${esc(p.name)}: ${p.hard ? 'trudny' : 'znany'}">${avatarHTML(p.id, 'sm')}</span>`).join('')}</span>`;
}

// Mały lampion serii pod profilem: zapalony, gdy seria trwa (z poświatą, jeśli dziś już była nauka), zgaszony bez serii.
function lampSVG(id, n, today) {
  return `<svg class="pick-lamp" viewBox="-14 -6 28 50" aria-hidden="true"><defs><radialGradient id="pl-${id}"><stop class="s-glow" offset="0" stop-opacity=".7"/><stop class="s-glow" offset="1" stop-opacity="0"/></radialGradient></defs>${n && today ? `<circle class="lamp-halo" cx="0" cy="21" r="24" fill="url(#pl-${id})"/>` : ''}${lampion(0, 0, 1, n > 0, 0).replace(/<circle class="lamp-halo"[^>]*>/, '')}</svg>`;
}

function pickStreakHTML(id) {
  const n = streakOf(id);
  const today = activeTodayOf(id);
  const label = n ? `Seria: ${n} ${dayWord(n)}${today ? ', dziś już była nauka' : ', dziś jeszcze nie było nauki'}` : 'Brak serii';
  return `<span class="pick-streak${n ? ' on' : ''}" role="img" aria-label="${label}" title="${label}">${lampSVG(id, n, today)}<b>${n}</b><span>${n ? dayWord(n) : 'bez serii'}</span></span>`;
}

export function profilePickerView() {
  const legacy = hasLegacy()
    ? `<div class="picker-note"><p>Znaleziono postęp z poprzedniej wersji (${legacyCount()} ${plural(legacyCount(), 'znak', 'znaki', 'znaków')}). Trafi do profilu, który teraz wybierzesz.</p><button class="link-btn" type="button" data-act="drop-legacy">Nie przenoś</button></div>`
    : '';
  const items = profileList().map((p) => {
    const n = knownCountOf(p.id);
    return `<li class="pick">
      <button class="pick-main" type="button" data-act="pick-profile" data-id="${p.id}" aria-label="Wejdź jako ${esc(p.name)}">
        ${avatarHTML(p.id, 'xl')}<b>${esc(p.name)}</b><small>${n} ${plural(n, 'znak', 'znaki', 'znaków')}</small>
      </button>
      ${pickStreakHTML(p.id)}
      <button class="link-btn" type="button" data-act="edit-profile" data-id="${p.id}">${ICONS.pencil} Edytuj</button>
    </li>`;
  }).join('');
  return `<div class="picker-in">
      <svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><g id="ant2"><path d="M27 33C22 27 20 21 18 11"/><path d="M23 25L12 21"/><path d="M20 17L20 8"/><path d="M25 29L16 30"/></g><use href="#ant2" transform="translate(64 0) scale(-1 1)"/></g><path d="M25 35Q32 30 39 35L32 56Z" fill="currentColor" opacity=".55"/></svg>
      <h1 class="sr-only">Wybierz profil</h1>
      ${legacy}
      <ul class="picks">${items}</ul>
      <button class="link-btn" type="button" data-act="open-sync">${ICONS.link} Połącz z drugim telefonem</button>
    </div>`;
}

export function profileSheetView(id, { picker = false } = {}) {
  const p = profileInfo(id);
  return `<div class="sheet-backdrop" data-act="close-sheet"></div>
    <form class="sheet sheet-profile" id="profile-form" data-id="${id}" role="dialog" aria-modal="true" aria-label="Profil ${esc(p.name)}">
      <div class="grab" aria-hidden="true"></div>
      <h2>Profil</h2>
      <div class="av-edit">${avatarHTML(id, 'xxl')}</div>
      <div class="av-actions">
        <button class="link-btn" type="button" data-act="pick-photo">${ICONS.camera} ${p.avatar ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}</button>
        ${p.avatar ? '<button class="link-btn" type="button" data-act="remove-photo">Usuń zdjęcie</button>' : ''}
      </div>
      <input type="file" id="av-file" accept="image/*" hidden>
      <label>Nazwa<input name="name" value="${esc(p.name)}" maxlength="16" required autocomplete="off"></label>
      <div class="btn-col">
        <button class="btn primary" type="submit">Zapisz</button>
        ${picker ? '' : '<button class="btn" type="button" data-act="switch-profile">Zmień profil</button><button class="btn" type="button" data-act="open-sync">Synchronizacja</button>'}
        <button class="btn" type="button" data-act="close-sheet">Zamknij</button>
      </div>
    </form>`;
}

export function syncSheetView(status, code) {
  let body;
  if (!syncConfigured()) {
    body = `<p class="muted">Synchronizacja nie jest jeszcze włączona w tej instalacji aplikacji. Do połączenia dwóch telefonów potrzebna jest darmowa baza Firebase; kroki są w pliku <b>docs/FIREBASE.md</b>. Do tego czasu każdy profil żyje tylko na tym urządzeniu.</p>`;
  } else if (!code) {
    body = `<p class="muted">Kod parowania łączy telefony: dzięki niemu każdy widzi postęp drugiej osoby, a profile są kopiowane na oba urządzenia.</p>
      <div class="btn-col"><button class="btn primary" type="button" data-act="sync-new">Utwórz kod na tym telefonie</button></div>
      <p class="muted sync-or">albo wpisz kod z drugiego telefonu</p>
      <form id="sync-form" class="sync-join"><input name="code" placeholder="XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Kod parowania" maxlength="16"><button class="btn primary" type="submit">Połącz</button></form>`;
  } else {
    const st = status.state === 'syncing' ? 'Synchronizuję…'
      : status.state === 'error' ? status.msg
      : status.at ? `Zsynchronizowano o ${new Date(status.at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}.` : 'Czekam na pierwszą synchronizację.';
    body = `<p class="muted">Wpisz ten kod na drugim telefonie (Połącz z drugim telefonem):</p>
      <p class="sync-code" aria-label="Kod parowania">${esc(prettyCode(code))}</p>
      <p class="sync-status${status.state === 'error' ? ' is-err' : ''}" role="status">${esc(st)}</p>
      <div class="btn-col">
        <button class="btn" type="button" data-act="sync-copy">Skopiuj kod</button>
        <button class="btn primary" type="button" data-act="sync-now">Synchronizuj teraz</button>
        <button class="btn" type="button" data-act="sync-off">Rozłącz ten telefon</button>
      </div>`;
  }
  return `<div class="sheet-backdrop" data-act="close-sheet"></div>
    <section class="sheet sheet-sync" role="dialog" aria-modal="true" aria-label="Synchronizacja">
      <div class="grab" aria-hidden="true"></div>
      <h2>Synchronizacja</h2>
      ${body}
      ${syncConfigured() && code ? '' : '<div class="btn-col"><button class="btn" type="button" data-act="close-sheet">Zamknij</button></div>'}
    </section>`;
}

// ——— Wybór motywu (arkusz od dołu): rodzina kolorów; tryb ciemny/jasny przełącza się osobnym przyciskiem w nagłówku ———
export function themeSheetView(current, mode) {
  const eff = effectiveMode(mode || 'auto');
  const card = (t) => `<button class="theme-card" type="button" data-act="set-theme" data-id="${t.id}" aria-pressed="${t.id === current}">
      <span class="theme-sw" aria-hidden="true">${t.sw[eff].map((c, i) => `<i style="background:${c}${i === 0 ? ';box-shadow:inset 0 0 0 1px rgba(128,128,128,.45)' : ''}"></i>`).join('')}</span>
      <b>${esc(t.name)}</b><small>${esc(t.note)}</small>
    </button>`;
  const group = (g, title) => `<h3 class="theme-group">${title}</h3><div class="theme-grid">${FAMILIES.filter((f) => f.group === g).map(card).join('')}</div>`;
  return `<div class="sheet-backdrop" data-act="close-sheet"></div>
    <section class="sheet sheet-themes" role="dialog" aria-modal="true" aria-label="Motyw kolorystyczny">
      <div class="grab" aria-hidden="true"></div>
      <h2>Motyw kolorystyczny</h2>
      <p class="muted theme-note">Motyw zapisuje się w profilu: ${esc(profileInfo(currentId())?.name || '')}. Drugi profil ma własny.</p>
      ${group('pink', 'Różowy akcent')}
      ${group('own', 'Własny akcent')}
      <div class="btn-col"><button class="btn" type="button" data-act="close-sheet">Gotowe</button></div>
    </section>`;
}

// ——— Karta znaku (arkusz od dołu) ———
export function sheetView(c) {
  const lv = LEVELS.find((l) => l.n === c.hsk);
  const known = isKnown(c.hanzi);
  const hard = isHard(c.hanzi);
  return `<div class="sheet-backdrop" data-act="close-sheet"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="Znak ${esc(c.hanzi)}">
      <div class="grab" aria-hidden="true"></div>
      <div class="writing">
        <figure class="wbox"><div class="wframe"><span class="wglyph" lang="zh">${esc(c.hanzi)}</span></div><figcaption>Pismo drukowane</figcaption></figure>
        <figure class="wbox stroke-box" data-h="${esc(c.hanzi)}"><div class="wframe"></div><figcaption class="stroke-count">Kolejność kresek</figcaption></figure>
      </div>
      <p class="sheet-py">${esc(c.pinyin)}${speakBtn(c.hanzi)}</p>
      <div class="sheet-meta"><p class="pill">${lv ? lv.label : ''}</p>${whoHTML(c.hanzi)}</div>
      <dl class="meanings"><div><dt>Polski</dt><dd>${esc(c.pl)}</dd></div><div><dt>English</dt><dd>${esc(c.en)}</dd></div></dl>
      ${sentenceHTML(c.hanzi)}
      ${wordsSectionHTML(c.hanzi)}
      <div class="btn-col">
        <button class="btn primary" data-act="toggle-known" data-h="${esc(c.hanzi)}">${known ? 'Usuń ze znanych' : 'Oznacz jako znany'}</button>
        <button class="btn" data-act="toggle-hard" data-h="${esc(c.hanzi)}">${hard ? 'Usuń z trudnych' : 'Dodaj do trudnych'}</button>
        <button class="btn${isVHard(c.hanzi) ? ' vh-on' : ''}" data-act="toggle-vhard" data-h="${esc(c.hanzi)}">${isVHard(c.hanzi) ? 'Już nie bardzo trudny' : 'Bardzo trudny'}</button>
      </div>
    </section>`;
}

// Wyniki wyszukiwania w oknie „Własna fiszka”: dotknięcie dodaje znak do trudnych (albo go stamtąd usuwa).
export function cardResultsHTML(q) {
  if (!q.trim()) return '';
  const list = search(q).slice(0, 8);
  if (!list.length) return '<p class="muted">Nie ma takiego znaku w bazie. Wpisz go ręcznie poniżej.</p>';
  return `<ul class="rows">${list.map((c) => {
    const hard = isHard(c.hanzi);
    return `<li class="row"><button class="row-main cf-row${hard ? ' is-hard' : ''}" type="button" data-act="cf-toggle" data-h="${esc(c.hanzi)}" aria-pressed="${hard}">
      <span class="hz-sm">${esc(c.hanzi)}</span>
      <span><b>${esc(c.pinyin)}</b><small>${esc(c.pl)} · ${esc(c.en)}</small></span>
      <span class="cf-state">${hard ? 'trudny ✓' : 'dodaj'}</span></button></li>`;
  }).join('')}</ul>`;
}

export function formView() {
  return `<div class="sheet-backdrop" data-act="close-sheet"></div>
    <form class="sheet" id="card-form" role="dialog" aria-modal="true" aria-label="Własna fiszka">
      <div class="grab" aria-hidden="true"></div>
      <h2>Dodaj do trudnych</h2>
      <label>Szukaj znaku<input id="cf-q" type="search" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="np. 好, hao albo dobry"></label>
      <div id="cf-results" class="cf-results" aria-live="polite">${cardResultsHTML('')}</div>
      <details class="cf-manual">
        <summary>Nie ma w bazie? Wpisz ręcznie</summary>
        <label>Znak lub słowo<input name="hanzi" maxlength="12" lang="zh" autocomplete="off"></label>
        <label>Pinyin<input name="pinyin" maxlength="40" autocomplete="off" autocapitalize="off"></label>
        <label>Znaczenie po polsku<input name="pl" maxlength="80" autocomplete="off"></label>
        <label>Znaczenie po angielsku<input name="en" maxlength="80" autocomplete="off"></label>
        <label>Notatka<input name="note" maxlength="120" autocomplete="off"></label>
        <div class="btn-col"><button class="btn primary" type="submit">Zapisz fiszkę</button></div>
      </details>
      <div class="btn-col"><button class="btn" type="button" data-act="close-sheet">Gotowe</button></div>
    </form>`;
}

// Zwijana lista słów na odkrytej fiszce (domyślnie zwinięta, żeby nie zdradzać i nie zasłaniać karty).
const CARD_WORDS = 6;
export function cardWordsHTML(hanzi) {
  const list = wordsWith(hanzi);
  if (!list.length) return '';
  return `<details class="card-words"><summary>Słowa z tym znakiem (${list.length})</summary>
    <ul>${list.slice(0, CARD_WORDS).map((x) => `<li><span class="cw-hz" lang="zh">${esc(x.w)}</span><span class="cw-py">${esc(x.pinyin)}</span><span class="cw-pl">${esc(x.pl)}</span></li>`).join('')}</ul>
    ${list.length > CARD_WORDS ? `<p class="cw-more">i ${list.length - CARD_WORDS} więcej w karcie znaku</p>` : ''}</details>`;
}

// ——— Sesja fiszek ———
const MODES = {
  review: { left: 'Jeszcze raz', tip: 'Przesuń w prawo, gdy znasz, w lewo, gdy nie, w górę, żeby pominąć.' },
  learn: { left: 'Trudny', tip: 'Przesuń w prawo, żeby dodać do znanych, w lewo, do trudnych, w górę, żeby pominąć.' },
};

export function sessionView(S) {
  const c = S.deck[S.i];
  const m = MODES[S.mode];
  const pct = (S.i / S.deck.length) * 100;
  return `<div class="session-top">
      <button class="icon-btn" data-act="end-session" aria-label="Zakończ sesję">${ICONS.close}</button>
      <div class="bar on-dark" role="progressbar" aria-valuemin="0" aria-valuemax="${S.deck.length}" aria-valuenow="${S.i}"><i style="width:${pct}%"></i></div>
      <span class="session-n">${S.i + 1}/${S.deck.length}</span>
    </div>
    <div class="stage">
      <div class="card${S.flipped ? ' is-flipped' : ''}${glowOf(c.hanzi, 4).cls}" id="card" tabindex="0" aria-label="Fiszka. Dotknij, aby odkryć odpowiedź.">
        ${glowOf(c.hanzi, 4).html}
        <div class="card-hz" lang="zh">${esc(c.hanzi)}</div>
        <div class="card-back">
          <p class="card-py">${esc(c.pinyin)}${speakBtn(c.hanzi)}</p>
          <p class="card-pl">${esc(c.pl)}</p>
          <p class="card-en">${esc(c.en)}</p>
          ${c.note ? `<p class="card-note">${esc(c.note)}</p>` : ''}
          ${c.key.startsWith('c:') ? '' : sentenceHTML(c.hanzi)}
          ${c.key.startsWith('c:') ? '' : cardWordsHTML(c.hanzi)}
        </div>
        ${whoHTML(c.hanzi, 'card-who')}
        <p class="card-hint">Dotknij, aby odkryć</p>
        <span class="stamp stamp-yes">Znam</span><span class="stamp stamp-no">${m.left}</span><span class="stamp stamp-skip">Dalej</span>
      </div>
    </div>
    <div class="session-actions">
      <button class="btn miss" data-act="answer" data-dir="no">${m.left}</button>
      <button class="btn skip" data-act="answer" data-dir="skip">Dalej</button>
      <button class="btn hit" data-act="answer" data-dir="yes">Znam</button>
    </div>
    <p class="session-tip">${m.tip}</p>`;
}

export function summaryView(S) {
  const graded = S.hit + S.miss.length;
  const learn = S.mode === 'learn';
  const lines = learn
    ? [`Dodano do znanych: ${S.hit}`, `Dodano do trudnych: ${S.miss.length}`]
    : [S.miss.length ? `Do powtórki zostało ${S.miss.length}.` : graded ? 'Wszystko poszło dobrze.' : 'Nic nie oceniono.'];
  if (S.skipped) lines.push(`Pominięte: ${S.skipped}`);
  return `<div class="session-top"><button class="icon-btn" data-act="end-session" aria-label="Zamknij">${ICONS.close}</button></div>
    <div class="summary">
      ${learn ? '' : `<p class="summary-score">${S.hit}<span>/${graded}</span></p>`}
      ${lines.map((l) => `<p class="summary-line">${l}</p>`).join('')}
      <div class="btn-col">
        ${!learn && S.miss.length ? '<button class="btn primary" data-act="retry-missed">Powtórz błędne</button>' : ''}
        <button class="btn ${!learn && S.miss.length ? '' : 'primary'}" data-act="end-session">Zamknij</button>
      </div>
    </div>`;
}

// ——— Quiz: pinyin → ton → znaczenie ———
const TONE_GLYPH = { 1: 'ā', 2: 'á', 3: 'ǎ', 4: 'à', 5: 'a' };

export function quizAskView(Q) {
  const c = Q.deck[Q.i];
  const pct = (Q.i / Q.deck.length) * 100;
  const tones = [1, 2, 3, 4, 5].map((t) =>
    `<button class="tone" type="button" data-act="quiz-tone" data-t="${t}" role="radio" aria-checked="${Q.tone === t}" aria-label="${TONE_LABEL[t]}">
      <span class="tone-g">${TONE_GLYPH[t]}</span><span class="tone-n">${t === 5 ? 'lekki' : t}</span></button>`).join('');
  return `<div class="session-top">
      <button class="icon-btn" data-act="end-session" aria-label="Zakończ quiz">${ICONS.close}</button>
      <div class="bar on-dark" role="progressbar" aria-valuemin="0" aria-valuemax="${Q.deck.length}" aria-valuenow="${Q.i}"><i style="width:${pct}%"></i></div>
      <span class="session-n">${Q.i + 1}/${Q.deck.length}</span>
    </div>
    <div class="stage quiz-stage"><div class="quiz-hz" lang="zh">${esc(c.hanzi)}</div></div>
    <form class="quiz-form" id="qz-form" autocomplete="off">
      <label>1. Pinyin bez tonu
        <input id="qz-py" name="py" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="np. ma">
      </label>
      <div class="field"><span id="tone-label">2. Ton</span>
        <div class="tones" role="radiogroup" aria-labelledby="tone-label">${tones}</div>
      </div>
      <label>3. Znaczenie (po polsku lub angielsku)
        <input id="qz-mean" name="meaning" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="np. koń">
      </label>
      <button class="btn primary" type="submit">Sprawdź</button>
    </form>`;
}

export function quizResultView(Q) {
  const r = Q.last;
  const c = r.item;
  const t = toneOf(c.pinyin);
  const plain = c.pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
  const row = (label, part, yours, right) => `<li class="qrow ${part.ok ? 'ok' : 'bad'}">
      <span class="qmark">${part.ok ? ICONS.check : ICONS.close}<span class="sr-only">${part.ok ? 'Dobrze' : 'Błąd'}</span></span>
      <span class="qbody"><b>${label}</b><small>Twoja odpowiedź: ${yours ? esc(yours) : 'brak'}${part.ok ? '' : `<br>Poprawnie: ${esc(right)}`}</small></span></li>`;
  const last = Q.i + 1 >= Q.deck.length;
  return `<div class="session-top">
      <button class="icon-btn" data-act="end-session" aria-label="Zakończ quiz">${ICONS.close}</button>
      <div class="bar on-dark" role="progressbar" aria-valuemin="0" aria-valuemax="${Q.deck.length}" aria-valuenow="${Q.i + 1}"><i style="width:${((Q.i + 1) / Q.deck.length) * 100}%"></i></div>
      <span class="session-n">${Q.i + 1}/${Q.deck.length}</span>
    </div>
    <div class="stage quiz-stage">
      <div class="quiz-hz small" lang="zh">${esc(c.hanzi)}</div>
      <p class="quiz-answer">${esc(c.pinyin)}${speakBtn(c.hanzi)}</p>
      <p class="quiz-meaning">${esc(c.pl)} · ${esc(c.en)}</p>
    </div>
    <ul class="qrows">
      ${row('Pinyin', r.py, r.py.val, plain)}
      ${row('Ton', r.tone, r.tone.val ? TONE_LABEL[r.tone.val] : '', TONE_LABEL[t])}
      ${row('Znaczenie', r.meaning, r.meaning.val, `${c.pl}; ${c.en}`)}
    </ul>
    <div class="quiz-form"><button class="btn primary" type="button" data-act="quiz-next" id="qz-next">${last ? 'Zobacz wynik' : 'Dalej'}</button></div>`;
}

export function quizSummaryView(Q) {
  const max = Q.deck.length * 3;
  const text = !Q.mode || Q.mode === 'text';
  return `<div class="session-top"><button class="icon-btn" data-act="end-session" aria-label="Zamknij">${ICONS.close}</button></div>
    <div class="summary">
      <p class="summary-score">${Q.full}<span>/${Q.deck.length}</span></p>
      <p class="summary-line">${text ? 'znaków w pełni poprawnie' : 'znaków poprawnie'}</p>
      ${text ? `<p class="summary-line">Punkty: ${Q.pts} z ${max}</p>` : ''}
      ${Q.miss.length ? `<ul class="miss-list" aria-label="Znaki do powtórki">${Q.miss.map((c) => `<li><span class="hz-sm" lang="zh">${esc(c.hanzi)}</span><span>${esc(c.pinyin)}</span></li>`).join('')}</ul>` : ''}
      <div class="btn-col">
        ${Q.miss.length ? `<button class="btn primary" data-act="quiz-retry">Powtórz błędne</button>${Q.miss.some((c) => !isHard(c.hanzi)) ? '<button class="btn" data-act="quiz-to-hard">Dodaj błędne do trudnych</button>' : ''}` : ''}
        <button class="btn ${Q.miss.length ? '' : 'primary'}" data-act="end-session">Zamknij</button>
      </div>
    </div>`;
}

// ——— Quiz ze słuchu ———
const sessionTop = (Q, n, closeLabel) => `<div class="session-top">
      <button class="icon-btn" data-act="end-session" aria-label="${closeLabel}">${ICONS.close}</button>
      <div class="bar on-dark" role="progressbar" aria-valuemin="0" aria-valuemax="${Q.deck.length}" aria-valuenow="${n}"><i style="width:${(n / Q.deck.length) * 100}%"></i></div>
      <span class="session-n">${Q.i + 1}/${Q.deck.length}</span>
    </div>`;

const LISTEN_PROMPT = { py: 'Jak to się czyta?', hz: 'Który to znak?', pl: 'Co to znaczy?' };

export function listenView(Q) {
  const c = Q.deck[Q.i];
  const q = Q.q;
  const res = Q.step === 'result' ? Q.last : null;
  const opts = q.options.map((o, i) => {
    const cls = res ? (o.ok ? ' ok' : res.pick === i ? ' bad' : '') : '';
    return `<button class="lopt${q.type === 'hz' ? ' hz' : ''}${cls}" type="button" data-act="listen-pick" data-i="${i}" ${res ? 'disabled' : ''} ${q.type === 'hz' ? 'lang="zh"' : ''}>${esc(o.label)}</button>`;
  }).join('');
  const reveal = res ? `<div class="listen-reveal ${res.ok ? 'ok' : 'bad'}">
      <span class="hz-sm" lang="zh">${esc(c.hanzi)}</span>
      <span><b>${esc(c.pinyin)}</b><small>${esc(c.pl)} · ${esc(c.en)}</small></span></div>
    <div class="quiz-form"><button class="btn primary" type="button" data-act="quiz-next" id="qz-next">${Q.i + 1 >= Q.deck.length ? 'Zobacz wynik' : 'Dalej'}</button></div>` : '';
  return `${sessionTop(Q, res ? Q.i + 1 : Q.i, 'Zakończ quiz')}
    <div class="stage listen-stage">
      <button class="listen-play" type="button" data-act="listen-play" aria-label="Odtwórz jeszcze raz">${ICONS.speaker}</button>
      <button class="listen-slow" type="button" data-act="listen-slow">wolniej</button>
      <p class="listen-q">${LISTEN_PROMPT[q.type]}</p>
    </div>
    <div class="lopts" role="group" aria-label="Odpowiedzi">${opts}</div>
    ${reveal}`;
}

// ——— Napisz znak ———
export function writeView(Q) {
  const c = Q.deck[Q.i];
  const r = Q.step === 'result' ? Q.last : null;
  const head = `<div class="write-head"><p class="write-py">${esc(c.pinyin)}${speakBtn(c.hanzi)}</p><p class="write-pl">${esc(c.pl)}</p></div>`;
  if (!r) {
    return `${sessionTop(Q, Q.i, 'Zakończ quiz')}
      <div class="stage write-stage">
        ${head}
        <div class="wpad"><canvas id="wpad" aria-label="Pole do pisania znaku palcem"></canvas></div>
        <div class="write-tools">
          <button class="btn ghost" type="button" data-act="write-undo" id="w-undo" disabled>Cofnij kreskę</button>
          <button class="btn ghost" type="button" data-act="write-clear" id="w-clear" disabled>Wyczyść</button>
        </div>
      </div>
      <div class="quiz-form">
        <button class="btn primary" type="button" data-act="write-check" id="w-check" disabled>Sprawdź</button>
        <button class="btn ghost" type="button" data-act="write-giveup">Nie pamiętam</button>
      </div>`;
  }
  const last = Q.i + 1 >= Q.deck.length;
  let body;
  if (r.gaveUp) {
    body = `<p class="write-verdict bad">Zapamiętaj wzór. Ten znak wróci do powtórki.</p>
      <div class="quiz-form"><button class="btn primary" type="button" data-act="write-verdict" data-ok="0" id="qz-next">${last ? 'Zobacz wynik' : 'Dalej'}</button></div>`;
  } else {
    const pct = Math.round(r.score * 100);
    const good = r.score >= PASS;
    body = `<p class="write-verdict ${good ? 'ok' : 'bad'}">${good ? 'Wygląda dobrze' : 'Kształt odbiega od wzoru'} <b>${pct}%</b></p>
      <p class="write-note">Kreski: wzór ${r.strokes}, Ty ${r.drawn}. Zielony to wzór, różowy to Twój rysunek.</p>
      <div class="quiz-form">
        <button class="btn primary" type="button" data-act="write-verdict" data-ok="${good ? 1 : 0}" id="qz-next">${good ? 'Zaliczone' : 'Do powtórki'}</button>
        <button class="btn ghost" type="button" data-act="write-verdict" data-ok="${good ? 0 : 1}">${good ? 'Jednak do powtórki' : 'Jednak zaliczone'}</button>
      </div>`;
  }
  return `${sessionTop(Q, Q.i + 1, 'Zakończ quiz')}
    <div class="stage write-stage">
      ${head}
      <div class="wpad result"><canvas id="wres" aria-label="Wzór znaku i Twój rysunek"></canvas></div>
    </div>
    ${body}`;
}
