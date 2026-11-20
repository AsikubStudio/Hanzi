// Widoki jako funkcje zwracające HTML. Zdarzenia obsługuje app.js (delegacja po data-act).
import { CHARS, LEVELS, BY_HANZI } from './data.js';
import { state, isKnown, isHard, streak } from './store.js';
import { dueDeck, knownCount, hardCount, customAsItems } from './srs.js';
import { search } from './search.js';
import { toneOf, TONE_LABEL } from './quiz.js';

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const svg = (d) =>
  `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ICONS = {
  home: svg('<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'),
  known: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>'),
  discover: svg('<path d="M12 3l5 7h-3l4 6H6l4-6H7z"/><path d="M12 16v5"/>'),
  cards: svg('<rect x="3" y="7" width="14" height="13" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v10"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
};

export const TABS = [
  ['home', 'Start'],
  ['known', 'Znane'],
  ['discover', 'Odkrywaj'],
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
    <defs><radialGradient id="halo"><stop offset="0" stop-color="#f07aa0" stop-opacity=".55"/><stop offset="1" stop-color="#f07aa0" stop-opacity="0"/></radialGradient></defs>
    <circle cx="282" cy="80" r="46" fill="url(#halo)"/><circle class="sun" cx="282" cy="80" r="18"/>
    <path class="ridge-back" d="M0 118C40 92 82 108 124 94S204 78 252 98S330 90 360 102V180H0Z"/>
    ${trees}
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

// ——— Start ———
export function homeView() {
  const known = knownCount();
  const total = CHARS.length;
  const r = rankInfo(known);
  const due = dueDeck().length;
  const st = streak();

  const cta = due > 0
    ? `<button class="btn primary" data-act="study-due">Powtórka na dziś (${due})</button>`
    : known === 0
      ? `<a class="btn primary" href="#/discover">Odkryj pierwsze znaki</a>`
      : '';

  const ladder = LEVELS.map((lv) => {
    const all = CHARS.filter((c) => c.hsk === lv.n).length;
    if (!all) return '';
    const k = knownCount(lv.n);
    return `<li class="rung">
      <div class="rung-head"><span class="rung-label">${lv.label}</span><span class="rung-name">${lv.name}</span><span class="rung-count">${k}/${all}</span></div>
      <div class="bar" role="progressbar" aria-label="${lv.label}" aria-valuemin="0" aria-valuemax="${all}" aria-valuenow="${k}"><i style="width:${(k / all) * 100}%"></i></div>
    </li>`;
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
    ${cta ? `<div class="cta-row">${cta}</div>` : ''}
    <section class="stats" aria-label="Statystyki">
      <div class="stat"><b>${known}</b><span>znane</span></div>
      <div class="stat"><b>${due}</b><span>do powtórki</span></div>
      <div class="stat"><b>${st}</b><span>${st === 1 ? 'dzień serii' : 'dni serii'}</span></div>
    </section>
    <section>
      <h2>Poziomy HSK</h2>
      <ul class="ladder">${ladder}</ul>
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
      <div class="empty"><p>Tu pojawią się znaki, które już znasz.</p><a class="btn" href="#/discover">Przejdź do Odkrywaj</a></div>`;
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

// ——— Odkrywaj ———
function tierState(i) {
  const lv = LEVELS[i];
  const all = CHARS.filter((c) => c.hsk === lv.n);
  if (!all.length) return null;
  const prev = LEVELS.slice(0, i).reverse().find((l) => CHARS.some((c) => c.hsk === l.n));
  const prevRatio = prev ? knownCount(prev.n) / CHARS.filter((c) => c.hsk === prev.n).length : 1;
  const todo = all.filter((c) => !isKnown(c.hanzi));
  return { lv, all, prev, todo, k: all.length - todo.length, locked: Boolean(prev) && prevRatio < 0.5 };
}

// Poziom, od którego warto zacząć naukę: pierwszy odblokowany z nieznanymi znakami.
export function nextLearnLevel() {
  const states = LEVELS.map((_, i) => tierState(i)).filter(Boolean);
  return (states.find((t) => !t.locked && t.todo.length) || states.find((t) => t.todo.length))?.lv.n ?? null;
}

export function discoverView(ui) {
  const next = nextLearnLevel();
  const tiers = LEVELS.map((_, i) => {
    const t = tierState(i);
    if (!t) return '';
    const { lv, todo, k, locked, prev, all } = t;
    const open = ui.openTiers.has(lv.n) || (!ui.tiersTouched && lv.n === next);
    return `<details class="tier${locked ? ' is-locked' : ''}" data-lv="${lv.n}" ${open ? 'open' : ''}>
      <summary>
        <span class="tier-title"><b>${lv.label}</b><em>${lv.name}</em></span>
        <span class="tier-meta">${locked ? ICONS.lock : ''}<span>${k}/${all.length}</span></span>
      </summary>
      ${locked ? `<p class="hint">Odblokuje się po opanowaniu połowy znaków z ${prev.label}. Możesz je jednak podejrzeć.</p>` : ''}
      ${todo.length
        ? `<div class="grid">${todo.map((c) => tile(c, locked)).join('')}</div>
           <div class="btn-row"><button class="btn small" type="button" data-act="learn-tier" data-lv="${lv.n}">Ucz się tych znaków (${Math.min(20, todo.length)})</button></div>`
        : '<p class="hint">Wszystkie znaki z tego poziomu masz już w Znanych.</p>'}
    </details>`;
  }).join('');

  const learn = next
    ? `<button class="btn primary" type="button" data-act="learn-tier" data-lv="${next}">Ucz się nowych znaków</button>`
    : '';
  return `${header('Do odkrycia')}${learn ? `<div class="cta-row">${learn}</div>` : ''}<div class="tiers">${tiers}</div>`;
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

// ——— Karta znaku (arkusz od dołu) ———
export function sheetView(c) {
  const lv = LEVELS.find((l) => l.n === c.hsk);
  const known = isKnown(c.hanzi);
  const hard = isHard(c.hanzi);
  return `<div class="sheet-backdrop" data-act="close-sheet"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="Znak ${esc(c.hanzi)}">
      <div class="grab" aria-hidden="true"></div>
      <div class="stroke-box" data-h="${esc(c.hanzi)}"><div class="sheet-hanzi" lang="zh">${esc(c.hanzi)}</div></div>
      <p class="sheet-py">${esc(c.pinyin)}</p>
      <p class="pill">${lv ? lv.label : ''}</p>
      <dl class="meanings"><div><dt>Polski</dt><dd>${esc(c.pl)}</dd></div><div><dt>English</dt><dd>${esc(c.en)}</dd></div></dl>
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
