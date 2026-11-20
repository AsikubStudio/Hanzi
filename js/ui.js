// Widoki jako funkcje zwracające HTML. Zdarzenia obsługuje app.js (delegacja po data-act).
import { CHARS, LEVELS, BY_HANZI } from './data.js';
import { state, isKnown, isHard, streak, dayStamp } from './store.js';
import { dueDeck, knownCount, hardCount, customAsItems } from './srs.js';
import { search } from './search.js';
import { toneOf, TONE_LABEL } from './quiz.js';
import { bestSentence } from './sentences.js';

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const svg = (d) =>
  `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ICONS = {
  home: svg('<path d="M12 3l5 7h-3l4 6H6l4-6H7z"/><path d="M12 16v5"/>'),
  known: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>'),
  cards: svg('<rect x="3" y="7" width="14" height="13" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v10"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  translate: svg('<path d="M3.5 5.5h9M8 3.5v2M5.2 5.5c.6 3.2 2.8 5.6 5.8 7M11 5.5c-.6 3-3 5.8-7 7.5"/><path d="M12.5 20.5l3.6-9 3.6 9M13.9 17.4h4.4"/>'),
  chevron: svg('<path d="M7 10l5 5 5-5"/>'),
};

export const TABS = [
  ['home', 'Start'],
  ['known', 'Znane'],
  ['cards', 'Fiszki'],
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
      <radialGradient id="halo"><stop offset="0" stop-color="#f07aa0" stop-opacity=".55"/><stop offset="1" stop-color="#f07aa0" stop-opacity="0"/></radialGradient>
      <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfeadb" stop-opacity="0"/><stop offset=".55" stop-color="#cfeadb" stop-opacity=".16"/><stop offset="1" stop-color="#cfeadb" stop-opacity="0"/></linearGradient>
    </defs>
    <path class="karst" d="M0 128V104Q8 100 14 84Q18 70 26 66Q34 64 38 80Q42 96 54 100Q60 80 66 62Q72 48 80 50Q88 54 90 72Q94 96 108 104Q122 100 130 88Q138 76 146 82Q152 92 156 104L170 112Q196 108 206 94Q214 82 222 86Q230 92 232 104Q246 112 262 106Q272 100 276 88Q282 70 292 66Q300 64 304 82Q308 100 322 106Q340 104 352 92L360 88V128Z"/>
    <rect x="0" y="96" width="360" height="26" fill="url(#mist)"/>
    <circle cx="282" cy="80" r="46" fill="url(#halo)"/><circle class="sun" cx="282" cy="80" r="18"/>
    <circle class="moongate" cx="282" cy="80" r="27"/>
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

const tile = (c, locked = false) =>
  `<button class="tile${isKnown(c.hanzi) ? ' is-known' : ''}${locked ? ' is-locked' : ''}" type="button" data-act="open" data-h="${esc(c.hanzi)}">
    <span class="hz">${esc(c.hanzi)}</span><span class="py">${esc(c.pinyin)}</span>
  </button>`;

const header = (title, right = '') => `<header class="top"><h1>${title}</h1><div class="top-actions">${right}</div></header>`;

// ——— Seria: płomienie rosną razem z liczbą dni ———
const dayWord = (n) => (n === 1 ? 'dzień' : 'dni');

const FLAMES = {
  1: { 1: [{ x: 80, h: 26 }], 2: [{ x: 68, h: 26 }, { x: 98, h: 20, d: 0.3 }] },
  2: [{ x: 50, h: 34 }, { x: 82, h: 48, d: 0.25 }, { x: 114, h: 32, d: 0.5 }],
  3: [{ x: 20, h: 38, d: 0.1 }, { x: 50, h: 56, d: 0.4 }, { x: 80, h: 82 }, { x: 112, h: 58, d: 0.3 }, { x: 142, h: 40, d: 0.6 }],
  4: [{ x: 0, h: 44, d: 0.2 }, { x: 28, h: 66, d: 0.5 }, { x: 56, h: 88, d: 0.1 }, { x: 86, h: 100 }, { x: 116, h: 84, d: 0.35 },
    { x: 146, h: 62, d: 0.15 }, { x: 172, h: 42, d: 0.45 }],
};

const flameSVG = ({ x, h, d = 0 }) =>
  `<svg class="flame" viewBox="0 0 40 60" style="--x:${x}px;--h:${h};--d:${d}s"><path class="f-out" d="M20 2C21 13 35 21 35 37c0 12-7 21-15 21S5 49 5 37c0-8 5-12 7-19 3 6 6 7 8-16z"/><path class="f-in" d="M20 26c1 7 8 11 8 19 0 7-4 11-8 11s-8-4-8-11c0-5 3-7 4-11 2 3 3 3 4-8z"/></svg>`;

function streakTile(days, doneToday) {
  const tier = days === 0 ? 0 : days < 3 ? 1 : days < 7 ? 2 : days < 14 ? 3 : 4;
  const specs = tier === 0 ? [] : tier === 1 ? FLAMES[1][days] : FLAMES[tier];
  const sparks = tier >= 3 ? Array.from({ length: tier === 3 ? 5 : 9 }, (_, i) =>
    `<i class="spark" style="--x:${20 + ((i * 37) % 150)}px;--d:${((i * 0.43) % 2.2).toFixed(2)}s"></i>`).join('') : '';
  const flames = tier === 0
    ? `<svg class="flame ghost" viewBox="0 0 40 60" style="--x:80px;--h:40"><path d="M20 2C21 13 35 21 35 37c0 12-7 21-15 21S5 49 5 37c0-8 5-12 7-19 3 6 6 7 8-16z"/></svg>`
    : specs.map(flameSVG).join('') + sparks;
  const note = days === 0
    ? 'Zrób dziś jedną powtórkę, żeby zacząć serię.'
    : doneToday ? 'Dzisiejsza powtórka zaliczona.' : 'Ćwicz dziś, żeby nie przerwać serii.';
  return `<div class="streak" data-tier="${tier}" role="group" aria-label="Seria: ${days} ${dayWord(days)}">
    <div class="streak-text"><b>${days}</b><span>${dayWord(days)} serii</span><small>${note}</small></div>
    <div class="flames" aria-hidden="true">${flames}</div>
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
      ? `<div class="btn-row"><button class="btn small" type="button" data-act="learn-tier" data-lv="${n}">Ucz się nieznanych (${Math.min(20, todo)})</button></div>`
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
    next ? `<button class="btn${due > 0 ? '' : ' primary'}" data-act="learn-tier" data-lv="${next}">Ucz się nowych znaków</button>` : '',
  ].join('');

  const levels = LEVELS.map((lv) => {
    const all = CHARS.filter((c) => c.hsk === lv.n).length;
    if (!all) return '';
    const k = knownCount(lv.n);
    const open = ui.openTiers.has(lv.n);
    return `<details class="tier" data-lv="${lv.n}" ${open ? 'open' : ''}>
      <summary>
        <span class="tier-head"><b>${lv.label}</b><em>${lv.name}</em><span class="tier-count">${k}/${all}</span><span class="chev">${ICONS.chevron}</span></span>
        <span class="bar" role="progressbar" aria-label="${lv.label}" aria-valuemin="0" aria-valuemax="${all}" aria-valuenow="${k}"><i style="width:${(k / all) * 100}%"></i></span>
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
      <p class="muted">Podaj pinyin, ton i znaczenie znaków, które już znasz.</p>
      <div class="chips" role="group" aria-label="Liczba znaków w quizie">${sizeChips}</div>
      ${ui.quizSize === 'custom' ? `<label class="num">Liczba znaków (1–${kc})
        <input id="quiz-n" type="number" inputmode="numeric" min="1" max="${kc}" value="${esc(ui.quizCustom)}"></label>` : ''}
      <div class="btn-row"><button class="btn primary" type="button" data-act="start-quiz">Zacznij quiz (${quizCount(ui)})</button></div>
    </section>
    <div class="chips" role="group" aria-label="Filtr poziomu">${chips}</div>
    <div id="known-grid">${knownGridHTML(ui)}</div>`;
}

// ——— Fiszki ———
export function cardsView(ui) {
  const kc = knownCount(ui.deckLevel);
  const size = Math.min(ui.deckSize, kc);
  const due = dueDeck().length;
  const hc = hardCount();
  const sizes = [10, 20, 30].map((n) => chip(String(n), ui.deckSize === n, 'deck-size', `data-n="${n}"`)).join('');
  const levels = [chip('Wszystkie', !ui.deckLevel, 'deck-level', 'data-lv="0"'),
    ...LEVELS.filter((l) => knownCount(l.n) > 0).map((l) => chip(l.label, ui.deckLevel === l.n, 'deck-level', `data-lv="${l.n}"`))].join('');

  const hardList = [
    ...state.hard.map((h) => BY_HANZI.get(h)).filter(Boolean)
      .map((c) => `<li class="row"><button class="row-main" data-act="open" data-h="${esc(c.hanzi)}"><span class="hz-sm">${esc(c.hanzi)}</span><span><b>${esc(c.pinyin)}</b><small>${esc(c.pl)}</small></span></button></li>`),
    ...customAsItems().map((c) => `<li class="row"><div class="row-main"><span class="hz-sm">${esc(c.hanzi)}</span><span><b>${esc(c.pinyin)}</b><small>${esc(c.pl || c.en)}</small></span></div>
        <button class="icon-btn" data-act="del-custom" data-id="${esc(c.key.slice(2))}" aria-label="Usuń fiszkę ${esc(c.hanzi)}">${ICONS.close}</button></li>`),
  ].join('');

  return `${header('Fiszki')}
    <section class="panel">
      <h2>Powtórka ze znanych</h2>
      <p class="muted">Wybierz poziom i liczbę kart. Talia jest losowana z Twoich Znanych.</p>
      <div class="chips" role="group" aria-label="Poziom talii">${levels}</div>
      <div class="chips" role="group" aria-label="Liczba kart">${sizes}</div>
      <div class="btn-row">
        <button class="btn primary" data-act="study-known" ${kc ? '' : 'disabled'}>${kc ? `Utwórz talię (${size})` : 'Brak znanych znaków'}</button>
        ${due ? `<button class="btn" data-act="study-due">Do powtórki dziś (${due})</button>` : ''}
      </div>
    </section>
    <section class="panel">
      <h2>Moje trudne fiszki</h2>
      <p class="muted">Dodawaj znaki, które sprawiają kłopot, albo twórz własne karty.</p>
      ${hc ? `<ul class="rows">${hardList}</ul>` : `<div class="empty small"><p>Nie masz jeszcze trudnych fiszek. Otwórz dowolny znak i wybierz „Dodaj do trudnych”.</p></div>`}
      <div class="btn-row">
        <button class="btn primary" data-act="study-hard" ${hc ? '' : 'disabled'}>Ćwicz trudne (${hc})</button>
        <button class="btn" data-act="new-card">${ICONS.plus}Własna fiszka</button>
      </div>
    </section>`;
}

// ——— Wyniki wyszukiwania (panel pod górnym paskiem) ———
export function resultsHTML(list, query) {
  if (!query.trim()) return '';
  if (!list.length) {
    return `<div class="empty small"><p>Brak wyników dla „${esc(query)}”. Spróbuj krótszej frazy albo innego języka.</p></div>`;
  }
  return `<p class="muted count-line">${list.length} ${list.length === 1 ? 'wynik' : 'wyników'}</p>
    <ul class="rows">${list.map((c) => `<li class="row"><button class="row-main" data-act="open" data-h="${esc(c.hanzi)}">
      <span class="hz-sm">${esc(c.hanzi)}</span>
      <span><b>${esc(c.pinyin)}</b><small>${esc(c.pl)} · ${esc(c.en)}</small></span>
      ${isKnown(c.hanzi) ? '<i class="dot" title="Znany"></i>' : ''}
    </button></li>`).join('')}</ul>`;
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
    <button class="tr-btn" type="button" data-act="toggle-tr" aria-pressed="${on}" aria-label="Pokaż tłumaczenie zdania" title="Tłumaczenie">${ICONS.translate}</button>
    <p class="s-zh" lang="zh">${zh}</p>
    <p class="s-py">${esc(st.py)}</p>
    <p class="s-pl">${esc(st.pl)}</p>
    ${hasUnknown ? '<p class="s-note">Przyciemnione znaki jeszcze nie są znane.</p>' : ''}
  </div>`;
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
      <p class="sheet-py">${esc(c.pinyin)}</p>
      <p class="pill">${lv ? lv.label : ''}</p>
      <dl class="meanings"><div><dt>Polski</dt><dd>${esc(c.pl)}</dd></div><div><dt>English</dt><dd>${esc(c.en)}</dd></div></dl>
      ${sentenceHTML(c.hanzi)}
      <div class="btn-col">
        <button class="btn primary" data-act="toggle-known" data-h="${esc(c.hanzi)}">${known ? 'Usuń ze znanych' : 'Oznacz jako znany'}</button>
        <button class="btn" data-act="toggle-hard" data-h="${esc(c.hanzi)}">${hard ? 'Usuń z trudnych' : 'Dodaj do trudnych'}</button>
      </div>
    </section>`;
}

export function formView() {
  return `<div class="sheet-backdrop" data-act="close-sheet"></div>
    <form class="sheet" id="card-form" role="dialog" aria-modal="true" aria-label="Nowa fiszka">
      <div class="grab" aria-hidden="true"></div>
      <h2>Własna fiszka</h2>
      <label>Znak lub słowo<input name="hanzi" required maxlength="12" lang="zh" autocomplete="off"></label>
      <label>Pinyin<input name="pinyin" maxlength="40" autocomplete="off" autocapitalize="off"></label>
      <label>Znaczenie po polsku<input name="pl" maxlength="80" autocomplete="off"></label>
      <label>Znaczenie po angielsku<input name="en" maxlength="80" autocomplete="off"></label>
      <label>Notatka<input name="note" maxlength="120" autocomplete="off"></label>
      <div class="btn-col"><button class="btn primary" type="submit">Zapisz fiszkę</button>
        <button class="btn" type="button" data-act="close-sheet">Anuluj</button></div>
    </form>`;
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
      <div class="card${S.flipped ? ' is-flipped' : ''}" id="card" tabindex="0" aria-label="Fiszka. Dotknij, aby odkryć odpowiedź.">
        <div class="card-hz" lang="zh">${esc(c.hanzi)}</div>
        <div class="card-back">
          <p class="card-py">${esc(c.pinyin)}</p>
          <p class="card-pl">${esc(c.pl)}</p>
          <p class="card-en">${esc(c.en)}</p>
          ${c.note ? `<p class="card-note">${esc(c.note)}</p>` : ''}
          ${c.key.startsWith('c:') ? '' : sentenceHTML(c.hanzi)}
        </div>
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
      <p class="quiz-answer">${esc(c.pinyin)}</p>
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
  return `<div class="session-top"><button class="icon-btn" data-act="end-session" aria-label="Zamknij">${ICONS.close}</button></div>
    <div class="summary">
      <p class="summary-score">${Q.full}<span>/${Q.deck.length}</span></p>
      <p class="summary-line">znaków w pełni poprawnie</p>
      <p class="summary-line">Punkty: ${Q.pts} z ${max}</p>
      ${Q.miss.length ? `<ul class="miss-list" aria-label="Znaki do powtórki">${Q.miss.map((c) => `<li><span class="hz-sm" lang="zh">${esc(c.hanzi)}</span><span>${esc(c.pinyin)}</span></li>`).join('')}</ul>` : ''}
      <div class="btn-col">
        ${Q.miss.length ? '<button class="btn primary" data-act="quiz-retry">Powtórz błędne</button><button class="btn" data-act="quiz-to-hard">Dodaj błędne do trudnych</button>' : ''}
        <button class="btn ${Q.miss.length ? '' : 'primary'}" data-act="end-session">Zamknij</button>
      </div>
    </div>`;
}
