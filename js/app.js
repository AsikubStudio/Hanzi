import { BY_HANZI } from './data.js';
import {
  state, isKnown, isHard, toggleKnown, toggleHard, addCustom, removeCustom, logReview, logTime, setTheme, setThemeMode, setShowTr,
} from './store.js';
import { grade, dueDeck, knownDeck, hardDeck, learnDeck, quizDeck } from './srs.js';
import { search } from './search.js';
import { gradeAnswer } from './quiz.js';
import { normalizeTheme, themeAttr, themeMeta, effectiveMode } from './themes.js';
import { mountStrokes } from './strokes.js';
import {
  tabbarHTML, homeView, knownView, cardsView, tierBodyHTML, resultsHTML, knownGridHTML, quizCount,
  sheetView, formView, themeSheetView, dayDetail, setStatsOpen, sessionView, summaryView, quizAskView, quizResultView, quizSummaryView,
} from './ui.js';

const $ = (sel) => document.querySelector(sel);
const view = $('#view');
const tabbar = $('#tabbar');
const sheetEl = $('#sheet');
const sessionEl = $('#session');
const toastEl = $('#toast');
const qInput = $('#q');
const qClear = $('#q-clear');
const panel = $('#searchpanel');

const ui = {
  tab: 'home',
  knownLevel: 0,
  knownQuery: '',
  knownSearchOpen: false,
  quizSize: '10',
  quizCustom: '15',
  openTiers: new Set(),
  deckSize: 20,
  deckLevel: 0,
};

const VIEWS = { home: homeView, known: knownView, cards: cardsView };

// ——— Router ———
function currentTab() {
  const id = location.hash.replace('#/', '');
  return VIEWS[id] ? id : 'home';
}

function render({ keepScroll = false } = {}) {
  ui.tab = currentTab();
  const y = window.scrollY;
  view.innerHTML = VIEWS[ui.tab](ui);
  tabbar.innerHTML = tabbarHTML(ui.tab);
  if (keepScroll) window.scrollTo(0, y);
}

window.addEventListener('hashchange', () => {
  if (!sheetEl.hidden) closeSheet();
  clearSearch();
  render();
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
});

// ——— Wyszukiwarka globalna (górny pasek) ———
function refreshSearch() {
  const q = qInput.value;
  const has = q.trim() !== '';
  panel.hidden = !has;
  qClear.hidden = q === '';
  panel.innerHTML = has ? resultsHTML(search(q), q) : '';
}

function clearSearch() {
  qInput.value = '';
  refreshSearch();
}

qInput.addEventListener('input', refreshSearch);
qClear.addEventListener('click', () => { clearSearch(); qInput.focus(); });

// ——— Motyw ———
// Motyw = rodzina kolorów (state.theme, wybór w arkuszu z ikony palety) × tryb (state.themeMode: auto/ciemny/jasny;
// przełącznik słońce/księżyc w nagłówku ustawia ciemny lub jasny, a do czasu pierwszego kliknięcia trwa Auto = zgodnie z systemem).
// Zmienne CSS: css/themes.css.
// Wybór jest zapisany na tym urządzeniu; starsze zapisy migrują się przy pierwszym uruchomieniu.
function applyTheme() {
  const n = normalizeTheme(state.theme, state.themeMode);
  if (state.theme !== n.theme) setTheme(n.theme);
  if (state.themeMode !== n.mode) setThemeMode(n.mode);
  document.documentElement.setAttribute('data-theme', themeAttr(n.theme, n.mode));
  $('meta[name="theme-color"]').setAttribute('content', themeMeta(n.theme, n.mode));
  $('#mode-btn').setAttribute('aria-label', effectiveMode(n.mode) === 'dark' ? 'Przełącz na jasny tryb' : 'Przełącz na ciemny tryb');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.themeMode === 'auto') applyTheme(); });

function openThemes() {
  openSheet(themeSheetView(state.theme, state.themeMode));
}

function refreshThemeSheet() {
  const box = sheetEl.querySelector('.sheet');
  if (!box) return;
  const scroll = box.scrollTop;
  sheetEl.innerHTML = themeSheetView(state.theme, state.themeMode);
  sheetEl.querySelector('.sheet').scrollTop = scroll;
}

function pickTheme(el) {
  setTheme(el.dataset.id);
  applyTheme();
  refreshThemeSheet();
  sheetEl.querySelector(`.theme-card[data-id="${el.dataset.id}"]`)?.focus({ preventScroll: true });
}

function toggleMode() {
  setThemeMode(effectiveMode(state.themeMode) === 'dark' ? 'light' : 'dark');
  applyTheme();
  if (sheetEl.querySelector('.sheet-themes')) refreshThemeSheet();
}

// ——— Toast ———
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// ——— Arkusz ———
let lastFocus = null;

function openSheet(html) {
  if (sheetEl.hidden) lastFocus = document.activeElement;
  sheetEl.innerHTML = html;
  sheetEl.hidden = false;
  requestAnimationFrame(() => sheetEl.classList.add('open'));
  sheetEl.querySelector('input,button.btn')?.focus({ preventScroll: true });
}

function closeSheet() {
  sheetEl.classList.remove('open');
  setTimeout(() => { if (!sheetEl.classList.contains('open')) { sheetEl.hidden = true; sheetEl.innerHTML = ''; } }, 180);
  lastFocus?.focus?.({ preventScroll: true });
}

function openChar(h) {
  const c = BY_HANZI.get(h);
  if (!c) return;
  openSheet(sheetView(c));
  const box = sheetEl.querySelector('.stroke-box');
  if (box) {
    mountStrokes(box, h).then((ok) => {
      if (!ok && box.isConnected) box.hidden = true; // brak danych kresek: zostaje samo pismo drukowane
      if (!ok) sheetEl.querySelector('.writing')?.classList.add('single');
    });
  }
}

// ——— Zegar nauki: liczy aktywny czas w sesjach i quizach ———
// Pojedynczy odcinek (od pokazania karty do odpowiedzi) liczy się najwyżej CAP ms, żeby przerwa nie zawyżała czasu.
const CAP = 45000;
let clockAt = 0;
const clockStart = () => { clockAt = Date.now(); };
function clockTick(keepRunning = true) {
  if (!clockAt) return;
  const now = Date.now();
  logTime(Math.min(now - clockAt, CAP));
  clockAt = keepRunning ? now : 0;
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clockTick(false);
  else if (S || Q) clockStart();
});

// ——— Sesja fiszek (review / learn) ———
let S = null;

function startSession(deck, emptyMsg, mode = 'review') {
  if (!deck.length) return toast(emptyMsg);
  S = { mode, deck, i: 0, flipped: false, hit: 0, miss: [], skipped: 0, done: false };
  openSessionScreen();
  drawSession();
}

function openSessionScreen() {
  clockStart();
  sessionEl.hidden = false;
  document.body.classList.add('in-session');
}

function drawSession() {
  sessionEl.innerHTML = S.done ? summaryView(S) : sessionView(S);
  if (!S.done) bindCard();
}

function endSession() {
  clockTick(false);
  S = null;
  Q = null;
  sessionEl.hidden = true;
  sessionEl.innerHTML = '';
  document.body.classList.remove('in-session');
  render({ keepScroll: true });
}

// dir: 'yes' | 'no' | 'skip'
function answer(dir) {
  if (!S || S.done) return;
  const c = S.deck[S.i];
  if (dir === 'skip') {
    S.skipped++;
  } else if (S.mode === 'learn') {
    if (dir === 'yes') { if (!isKnown(c.hanzi)) toggleKnown(c.hanzi); S.hit++; }
    else { if (!isHard(c.hanzi)) toggleHard(c.hanzi); S.miss.push(c); }
    logReview();
  } else {
    grade(c.key, dir === 'yes');
    logReview({ graded: true, ok: dir === 'yes' });
    if (dir === 'yes') S.hit++; else S.miss.push(c);
  }
  S.flipped = false;
  S.i++;
  if (S.i >= S.deck.length) S.done = true;
  clockTick(!S.done);
  drawSession();
}

function bindCard() {
  const card = $('#card');
  if (!card) return;
  let sx = 0, sy = 0, dx = 0, dy = 0, drag = false, moved = false;

  const flip = () => { S.flipped = !S.flipped; card.classList.toggle('is-flipped', S.flipped); };
  const reset = () => {
    card.style.transform = '';
    card.dataset.dir = '';
    card.style.setProperty('--pull', 0);
  };
  const fling = (dir, x, y, rot) => {
    card.style.transition = 'transform .18s ease-in, opacity .18s';
    card.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    card.style.opacity = '0';
    setTimeout(() => answer(dir), 170);
  };

  card.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-act]')) return; // przyciski na karcie (np. tłumaczenie) nie przewracają ani nie przeciągają karty
    drag = true; moved = false; sx = e.clientX; sy = e.clientY; dx = 0; dy = 0;
    card.setPointerCapture(e.pointerId);
    card.classList.add('dragging');
  });
  card.addEventListener('pointermove', (e) => {
    if (!drag) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
    const up = dy < -30 && Math.abs(dy) > Math.abs(dx);
    card.style.transform = up ? `translateY(${dy}px)` : `translateX(${dx}px) rotate(${dx / 22}deg)`;
    card.dataset.dir = up ? 'skip' : dx > 24 ? 'yes' : dx < -24 ? 'no' : '';
    card.style.setProperty('--pull', Math.min(1, (up ? Math.abs(dy) : Math.abs(dx)) / 110));
  });
  const release = () => {
    if (!drag) return;
    drag = false;
    card.classList.remove('dragging');
    if (dy < -100 && Math.abs(dy) > Math.abs(dx)) fling('skip', 0, -520, 0);
    else if (Math.abs(dx) > 100) { const ok = dx > 0; fling(ok ? 'yes' : 'no', ok ? 520 : -520, 0, ok ? 18 : -18); }
    else { reset(); if (!moved) flip(); }
  };
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);
  card.addEventListener('keydown', (e) => {
    if (e.target !== card) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
  });
}

// ——— Quiz: pinyin → ton → znaczenie ———
let Q = null;

function startQuiz(deck) {
  if (!deck.length) return toast('Najpierw dodaj znane znaki.');
  Q = { deck, i: 0, step: 'ask', tone: null, pts: 0, full: 0, miss: [], last: null, done: false };
  openSessionScreen();
  drawQuiz();
}

function drawQuiz() {
  sessionEl.innerHTML = Q.done ? quizSummaryView(Q) : Q.step === 'ask' ? quizAskView(Q) : quizResultView(Q);
  if (Q.done) return;
  if (Q.step === 'ask') $('#qz-py')?.focus({ preventScroll: true });
  else $('#qz-next')?.focus({ preventScroll: true });
}

function setTone(t) {
  Q.tone = t;
  sessionEl.querySelectorAll('.tone').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.t) === t)));
}

function quizCheck() {
  const c = Q.deck[Q.i];
  const res = gradeAnswer({
    py: $('#qz-py').value,
    tone: Q.tone,
    meaning: $('#qz-mean').value,
  }, c);
  grade(c.key, res.full);
  logReview({ graded: true, ok: res.full });
  Q.pts += res.pts;
  if (res.full) Q.full++; else Q.miss.push(c);
  Q.last = { ...res, item: c };
  Q.step = 'result';
  clockTick();
  drawQuiz();
}

function quizNext() {
  Q.i++;
  Q.tone = null;
  Q.step = 'ask';
  if (Q.i >= Q.deck.length) Q.done = true;
  clockTick(!Q.done);
  drawQuiz();
}

// ——— Klawiatura ———
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!sheetEl.hidden) closeSheet();
    else if (S || Q) endSession();
    else if (qInput.value) clearSearch();
    return;
  }
  if (S && !S.done) {
    if (e.key === 'ArrowRight') answer('yes');
    if (e.key === 'ArrowLeft') answer('no');
    if (e.key === 'ArrowUp') answer('skip');
  }
  if (Q && Q.step === 'ask' && e.key === 'Enter' && e.target.id === 'qz-py') {
    e.preventDefault();
    $('#qz-mean').focus();
  }
});

// ——— Akcje (delegacja zdarzeń) ———
const afterToggle = (h, msg) => {
  toast(msg);
  openChar(h);
  refreshSearch();
  render({ keepScroll: true });
};

const ACTIONS = {
  open: (el) => openChar(el.dataset.h),
  'close-sheet': closeSheet,
  theme: openThemes,
  'set-theme': pickTheme,
  mode: toggleMode,
  'cal-day': (el) => {
    document.querySelectorAll('.cal-c.sel').forEach((n) => n.classList.remove('sel'));
    el.classList.add('sel');
    document.querySelector('.cal-detail').innerHTML = dayDetail(el.dataset.d);
  },
  'toggle-stats': (el) => {
    const card = el.closest('.streak-card');
    const open = !card.classList.contains('is-open');
    card.classList.toggle('is-open', open);
    el.setAttribute('aria-expanded', String(open));
    card.querySelector('.streak-more-in').toggleAttribute('inert', !open);
    setStatsOpen(open);
  },
  'toggle-tr': () => {
    setShowTr(!state.showTr);
    document.querySelectorAll('.sentence').forEach((d) => {
      d.classList.toggle('show-tr', state.showTr);
      d.querySelector('.tr-btn')?.setAttribute('aria-pressed', String(state.showTr));
    });
  },
  'toggle-known': (el) => {
    const h = el.dataset.h;
    toggleKnown(h);
    afterToggle(h, state.known[h] ? `Dodano ${h} do znanych` : `Usunięto ${h} ze znanych`);
  },
  'toggle-hard': (el) => {
    const h = el.dataset.h;
    toggleHard(h);
    afterToggle(h, isHard(h) ? `Dodano ${h} do trudnych` : `Usunięto ${h} z trudnych`);
  },
  'known-level': (el) => { ui.knownLevel = Number(el.dataset.lv); render({ keepScroll: true }); },
  'known-search': () => {
    ui.knownSearchOpen = !ui.knownSearchOpen;
    if (!ui.knownSearchOpen) ui.knownQuery = '';
    render({ keepScroll: true });
    if (ui.knownSearchOpen) $('#kq')?.focus({ preventScroll: true });
  },
  'quiz-size': (el) => { ui.quizSize = el.dataset.n; render({ keepScroll: true }); },
  'start-quiz': () => startQuiz(quizDeck(quizCount(ui))),
  'quiz-tone': (el) => setTone(Number(el.dataset.t)),
  'quiz-next': quizNext,
  'quiz-retry': () => startQuiz(Q.miss),
  'quiz-to-hard': () => {
    Q.miss.forEach((c) => { if (!isHard(c.hanzi)) toggleHard(c.hanzi); });
    toast('Dodano błędne znaki do trudnych');
  },
  'deck-level': (el) => { ui.deckLevel = Number(el.dataset.lv); render({ keepScroll: true }); },
  'deck-size': (el) => { ui.deckSize = Number(el.dataset.n); render({ keepScroll: true }); },
  'study-known': () => startSession(knownDeck({ level: ui.deckLevel || null, size: ui.deckSize }), 'Brak znanych znaków w tym poziomie.'),
  'study-due': () => startSession(dueDeck(), 'Nic do powtórki na dziś.'),
  'study-hard': () => startSession(hardDeck(), 'Dodaj najpierw trudne fiszki.'),
  'learn-tier': (el) => startSession(learnDeck(Number(el.dataset.lv)), 'Wszystkie znaki z tego poziomu już znasz.', 'learn'),
  'new-card': () => openSheet(formView()),
  'del-custom': (el) => { removeCustom(el.dataset.id); toast('Usunięto fiszkę'); render({ keepScroll: true }); },
  answer: (el) => answer(el.dataset.dir),
  'end-session': endSession,
  'retry-missed': () => {
    const deck = S.miss;
    S = { mode: S.mode, deck, i: 0, flipped: false, hit: 0, miss: [], skipped: 0, done: false };
    clockStart();
    drawSession();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) fn(el);
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'qz-form') {
    e.preventDefault();
    quizCheck();
    return;
  }
  if (e.target.id !== 'card-form') return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const hanzi = f.hanzi.trim();
  if (!hanzi) return;
  addCustom({ hanzi, pinyin: f.pinyin.trim(), pl: f.pl.trim(), en: f.en.trim(), note: f.note.trim() });
  closeSheet();
  toast('Zapisano fiszkę');
  render({ keepScroll: true });
});

document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'kq') {
    ui.knownQuery = e.target.value;
    $('#known-grid').innerHTML = knownGridHTML(ui);
  } else if (id === 'quiz-n') {
    ui.quizCustom = e.target.value;
    const btn = $('[data-act="start-quiz"]');
    if (btn) btn.textContent = `Zacznij quiz (${quizCount(ui)})`;
  } else if (id === 'qz-py') {
    // Cyfra na końcu (np. „ma3”) ustawia ton, a pole zostaje z samą sylabą.
    const m = e.target.value.match(/^(.*?)([0-5])$/);
    if (m && Q) { e.target.value = m[1]; setTone(m[2] === '0' ? 5 : Number(m[2])); }
  }
});

// <details> nie bąbelkuje zdarzenia toggle, więc łapiemy je w fazie przechwytywania.
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!d.matches?.('details.tier')) return;
  const n = Number(d.dataset.lv);
  if (d.open) {
    ui.openTiers.add(n);
    const body = d.querySelector('.tier-body');
    if (body && !body.innerHTML.trim()) body.innerHTML = tierBodyHTML(n);
  } else {
    ui.openTiers.delete(n);
  }
}, true);

// ——— Start ———
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline-cache opcjonalny */ });
}
