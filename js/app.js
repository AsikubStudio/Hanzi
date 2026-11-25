import { BY_HANZI } from './data.js';
import {
  state, isKnown, isHard, isVHard, setVHard, toggleKnown, toggleHard, addCustom, removeCustom, logReview, logTime, setTheme, setThemeMode, setShowTr, setLearnPref,
  currentId, selectProfile, leaveProfile, profileInfo, setProfileName, setProfileAvatar, hasLegacy, adoptLegacy, dropLegacy, onChange, getSyncCode,
} from './store.js';
import { initSync, syncNow, connect, disconnect, newCode, normalizeCode, validCode, prettyCode, getStatus, onStatus } from './sync.js';
import { fileToAvatar } from './avatar.js';
import { speak, canSpeak } from './speak.js';
import { grade as gradeRaw, dueDeck, hardDeck, hardCharDeck, vhardDeck, learnDeck, quizDeck } from './srs.js';
import { search } from './search.js';
import { gradeAnswer } from './quiz.js';
import { BY_WORD } from './words.js';
import { buildQuestion, randomType } from './listen.js';
import { mountPad, scoreWriting, paintResult, paintReference } from './write.js';
import { loadStrokes } from './strokes.js';
import { normalizeTheme, themeAttr, themeMeta, effectiveMode } from './themes.js';
import { mountStrokes } from './strokes.js';
import {
  tabbarHTML, homeView, knownView, hardView, cardResultsHTML, tierBodyHTML, resultsHTML, knownGridHTML, hardGridHTML, quizCount, learnSheetView, learnCount, learnTodo,
  sheetView, wordSheetView, formView, listenView, writeView, themeSheetView, avatarHTML, profilePickerView, profileSheetView, syncSheetView, dayDetail, setStatsOpen, sessionView, summaryView, quizAskView, quizResultView, quizSummaryView,
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
const pickerEl = $('#picker');
const appEl = $('#app');
const meBtn = $('#me-btn');

const ui = {
  tab: 'home',
  knownLevel: 0,
  knownQuery: '',
  knownSearchOpen: false,
  quizSize: '10',
  quizCustom: '15',
  quizMode: 'text', hardMode: 'cards',
  listenType: 'mix',
  openTiers: new Set(),
  hardLevel: 0,
  hardQuery: '',
  hardSearchOpen: false,
};

const VIEWS = { home: homeView, known: knownView, hard: hardView };

// ——— Router ———
function currentTab() {
  let id = location.hash.replace('#/', '');
  if (id === 'cards') id = 'hard'; // stary adres zakładki „Fiszki”
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
// Wybór jest zapisany w profilu (osobno u Asi i Kuby); starsze zapisy migrują się przy pierwszym uruchomieniu.
const lastUi = () => { try { return JSON.parse(localStorage.getItem('bothanzi:ui')) || {}; } catch { return {}; } };
const themeSrc = () => (currentId() ? state : lastUi()); // na ekranie wyboru profilu: motyw ostatnio używanego profilu

function applyTheme() {
  const src = themeSrc();
  const n = normalizeTheme(src.theme, src.themeMode);
  if (currentId()) {
    if (state.theme !== n.theme) setTheme(n.theme);
    if (state.themeMode !== n.mode) setThemeMode(n.mode);
  }
  document.documentElement.setAttribute('data-theme', themeAttr(n.theme, n.mode));
  $('meta[name="theme-color"]').setAttribute('content', themeMeta(n.theme, n.mode));
  $('#mode-btn').setAttribute('aria-label', effectiveMode(n.mode) === 'dark' ? 'Przełącz na jasny tryb' : 'Przełącz na ciemny tryb');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (themeSrc().themeMode === 'auto' || !themeSrc().themeMode) applyTheme(); });

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

// Ocena z komunikatem, gdy znak właśnie stał się „bardzo trudnym” (3 błędy z rzędu).
function grade(key, ok) {
  if (gradeRaw(key, ok) === 'vhard') toast(`${key} jest teraz bardzo trudny`);
}

// ——— Arkusz ———
let lastFocus = null;

// Okienka z polem tekstowym (własna fiszka, liczba znaków, profil, kod parowania) są wyśrodkowane,
// a warstwa arkusza dopasowuje się do widocznej części ekranu, więc klawiatura telefonu ich nie zasłania.
const TEXT_INPUT = 'input:not([type=file]):not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea';
function markDialog() {
  const box = sheetEl.querySelector('.sheet');
  if (box) box.classList.toggle('is-dialog', box.matches('.sheet-learn') || Boolean(box.querySelector(TEXT_INPUT)));
}
new MutationObserver(markDialog).observe(sheetEl, { childList: true });

const vv = window.visualViewport;
function fitViewport() {
  if (!vv || sheetEl.hidden) return;
  sheetEl.style.top = `${vv.offsetTop}px`;
  sheetEl.style.height = `${vv.height}px`;
  sheetEl.style.bottom = 'auto';
  const f = document.activeElement;
  if (f && sheetEl.contains(f) && f.matches(TEXT_INPUT)) f.scrollIntoView({ block: 'nearest' });
}
vv?.addEventListener('resize', fitViewport);
vv?.addEventListener('scroll', fitViewport);
sheetEl.addEventListener('focusin', () => setTimeout(fitViewport, 50));

function openSheet(html) {
  if (sheetEl.hidden) lastFocus = document.activeElement;
  sheetEl.innerHTML = html;
  markDialog();
  sheetEl.hidden = false;
  fitViewport();
  requestAnimationFrame(() => sheetEl.classList.add('open'));
  sheetEl.querySelector('input,button.btn')?.focus({ preventScroll: true });
}

function closeSheet() {
  sheetEl.classList.remove('open');
  setTimeout(() => { if (!sheetEl.classList.contains('open')) { sheetEl.hidden = true; sheetEl.innerHTML = ''; } }, 180);
  lastFocus?.focus?.({ preventScroll: true });
}

// Przesunięcie arkusza palcem w dół zamyka go (tylko układ mobilny; na dużym ekranie arkusz jest wyśrodkowany).
{
  let g = null;
  sheetEl.addEventListener('touchstart', (e) => {
    const box = e.target.closest('.sheet');
    if (!box || box.classList.contains('is-dialog') || e.touches.length !== 1 || matchMedia('(min-width: 900px)').matches) { g = null; return; }
    const y = e.touches[0].clientY;
    // Z uchwytu (górny pasek arkusza) przesuwanie działa zawsze, z reszty tylko gdy arkusz jest przewinięty do góry.
    g = { box, y, x: e.touches[0].clientX, t: Date.now(), on: false, top: box.scrollTop <= 0, handle: y - box.getBoundingClientRect().top < 48 };
  }, { passive: true });
  sheetEl.addEventListener('touchmove', (e) => {
    if (!g) return;
    const dy = e.touches[0].clientY - g.y;
    const dx = e.touches[0].clientX - g.x;
    if (!g.on) {
      if (dy < 8 || Math.abs(dy) < Math.abs(dx) || !(g.handle || (g.top && g.box.scrollTop <= 0))) return;
      g.on = true;
      g.box.style.transition = 'none';
    }
    e.preventDefault();
    const d = Math.max(0, dy);
    g.box.style.transform = `translateY(${d}px)`;
    const bd = sheetEl.querySelector('.sheet-backdrop');
    if (bd) bd.style.opacity = String(Math.max(0, 1 - d / 420));
  }, { passive: false });
  const end = (e) => {
    if (!g?.on) { g = null; return; }
    const { box } = g;
    const dy = (e.changedTouches?.[0]?.clientY ?? g.y) - g.y;
    const fast = dy / Math.max(1, Date.now() - g.t) > 0.6;
    g = null;
    box.style.transition = '';
    box.style.transform = '';
    const bd = sheetEl.querySelector('.sheet-backdrop');
    if (bd) bd.style.opacity = '';
    if (dy > 110 || (fast && dy > 40)) closeSheet();
  };
  sheetEl.addEventListener('touchend', end);
  sheetEl.addEventListener('touchcancel', end);
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

// ——— Profile (Asia, Kuba) ———
function updateMe() {
  const id = currentId();
  meBtn.hidden = !id;
  if (!id) return;
  meBtn.innerHTML = avatarHTML(id, 'sm');
  meBtn.setAttribute('aria-label', `Profil: ${profileInfo(id).name}`);
}

function showPicker() {
  clearSearch();
  pickerEl.innerHTML = profilePickerView();
  pickerEl.hidden = false;
  appEl.inert = true;
  document.body.classList.add('in-picker');
  applyTheme();
  pickerEl.querySelector('.pick-main')?.focus({ preventScroll: true });
}

function refreshPicker() {
  if (pickerEl.hidden) return;
  const y = pickerEl.scrollTop;
  pickerEl.innerHTML = profilePickerView();
  pickerEl.scrollTop = y;
}

function enterProfile(id) {
  if (hasLegacy()) adoptLegacy(id); // postęp sprzed profili trafia do pierwszego wybranego profilu
  selectProfile(id);
  pickerEl.hidden = true;
  pickerEl.innerHTML = '';
  appEl.inert = false;
  document.body.classList.remove('in-picker');
  Object.assign(ui, { tab: 'home', knownLevel: 0, knownQuery: '', knownSearchOpen: false, hardLevel: 0, hardQuery: '', hardSearchOpen: false });
  ui.openTiers.clear();
  location.hash = '#/home';
  applyTheme();
  updateMe();
  render();
  window.scrollTo(0, 0);
  syncNow();
}

function refreshProfileSheet() {
  const form = sheetEl.querySelector('#profile-form');
  if (!form) return;
  const name = form.elements.name.value;
  sheetEl.innerHTML = profileSheetView(form.dataset.id, { picker: !form.querySelector('[data-act="switch-profile"]') });
  sheetEl.querySelector('#profile-form').elements.name.value = name;
}

function refreshSyncSheet() {
  const box = sheetEl.querySelector('.sheet');
  if (!box?.classList.contains('sheet-sync')) return;
  const scroll = box.scrollTop;
  sheetEl.innerHTML = syncSheetView(getStatus(), getSyncCode());
  sheetEl.querySelector('.sheet').scrollTop = scroll;
}
onStatus(refreshSyncSheet);

onChange((kind) => {
  updateMe();
  refreshPicker();
  if (kind === 'remote' && currentId()) {
    applyTheme();
    if (!S && !Q) render({ keepScroll: true });
  }
});

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
    if (e.target.closest('[data-act], .card-words')) return; // przyciski i lista słów na karcie (np. tłumaczenie) nie przewracają ani nie przeciągają karty
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

function startQuiz(deck, mode = 'text', emptyMsg = 'Najpierw dodaj znane znaki.') {
  if (!deck.length) return toast(emptyMsg);
  if (mode === 'listen' && !canSpeak) return toast('Ta przeglądarka nie obsługuje czytania na głos.');
  Q = { mode, deck, i: 0, step: 'ask', tone: null, pts: 0, full: 0, miss: [], last: null, done: false, q: null, pad: null };
  openSessionScreen();
  drawQuiz();
}

function drawQuiz() {
  Q.pad?.destroy();
  Q.pad = null;
  if (Q.done) { sessionEl.innerHTML = quizSummaryView(Q); return; }
  if (Q.mode === 'listen') return drawListen();
  if (Q.mode === 'write') return drawWrite();
  sessionEl.innerHTML = Q.step === 'ask' ? quizAskView(Q) : quizResultView(Q);
  if (Q.step === 'ask') $('#qz-py')?.focus({ preventScroll: true });
  else $('#qz-next')?.focus({ preventScroll: true });
}

const speakMsg = (r) => {
  if (r === 'novoice') toast('Ten telefon nie ma chińskiego głosu. Zainstaluj go w ustawieniach mowy.');
  else if (r === 'unsupported') toast('Ta przeglądarka nie obsługuje czytania na głos.');
};

// ——— Quiz ze słuchu ———
function drawListen() {
  const c = Q.deck[Q.i];
  const fresh = Q.step === 'ask' && !Q.q;
  if (fresh) Q.q = buildQuestion(c, randomType(c, ui.listenType));
  sessionEl.innerHTML = listenView(Q);
  if (fresh) speakMsg(speak(c.hanzi));
  if (Q.step === 'result') $('#qz-next')?.focus({ preventScroll: true });
}

function listenPick(i) {
  if (Q.mode !== 'listen' || Q.step !== 'ask') return;
  const c = Q.deck[Q.i];
  const ok = Boolean(Q.q.options[i]?.ok);
  grade(c.key, ok);
  logReview({ graded: true, ok });
  if (ok) Q.full++; else Q.miss.push(c);
  Q.last = { item: c, pick: i, ok };
  Q.step = 'result';
  clockTick();
  drawListen();
}

// ——— Napisz znak ———
function drawWrite() {
  const c = Q.deck[Q.i];
  sessionEl.innerHTML = writeView(Q);
  if (Q.step === 'ask') {
    const sync = () => {
      const n = Q.pad ? Q.pad.count() : 0;
      $('#w-undo').disabled = $('#w-clear').disabled = $('#w-check').disabled = n === 0;
    };
    Q.pad = mountPad($('#wpad'), sync);
  } else {
    const cv = $('#wres');
    if (Q.last.gaveUp) paintReference(cv, c.hanzi);
    else paintResult(cv, Q.last.res);
    $('#qz-next')?.focus({ preventScroll: true });
  }
}

async function writeCheck() {
  if (Q.mode !== 'write' || Q.step !== 'ask' || !Q.pad || !Q.pad.count()) return;
  const c = Q.deck[Q.i];
  const strokes = Q.pad.strokes.map((s) => s.map((p) => [...p]));
  let res;
  try { res = await scoreWriting(strokes, c.hanzi); } catch { return toast('Brak danych kresek tego znaku. Pominięto.'); }
  if (!Q || Q.mode !== 'write' || Q.step !== 'ask') return;
  Q.last = { item: c, score: res.score, strokes: res.strokes, drawn: strokes.length, res };
  Q.step = 'result';
  clockTick();
  drawWrite();
}

function writeGiveUp() {
  if (Q.mode !== 'write' || Q.step !== 'ask') return;
  Q.last = { item: Q.deck[Q.i], gaveUp: true };
  Q.step = 'result';
  clockTick();
  drawWrite();
}

function writeVerdict(ok) {
  if (Q.mode !== 'write' || Q.step !== 'result') return;
  const c = Q.deck[Q.i];
  grade(c.key, ok);
  logReview({ graded: true, ok });
  if (ok) Q.full++; else Q.miss.push(c);
  quizNext();
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
  Q.q = null;
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
  'open-word': (el) => { const x = BY_WORD.get(el.dataset.w); if (x) openSheet(wordSheetView(x)); },
  'close-sheet': closeSheet,
  theme: openThemes,
  'set-theme': pickTheme,
  mode: toggleMode,
  speak: (el) => {
    const r = speak(el.dataset.t);
    if (r === 'novoice') toast('Ten telefon nie ma chińskiego głosu. Zainstaluj go w ustawieniach mowy.');
    else if (r === 'unsupported') toast('Ta przeglądarka nie obsługuje czytania na głos.');
  },
  me: () => openSheet(profileSheetView(currentId())),
  'edit-profile': (el) => openSheet(profileSheetView(el.dataset.id, { picker: true })),
  'pick-profile': (el) => enterProfile(el.dataset.id),
  'drop-legacy': () => { dropLegacy(); refreshPicker(); },
  'switch-profile': () => {
    if (S || Q) return;
    closeSheet();
    syncNow();
    leaveProfile();
    showPicker();
  },
  'pick-photo': () => $('#av-file')?.click(),
  'remove-photo': () => { setProfileAvatar(sheetEl.querySelector('#profile-form').dataset.id, null); refreshProfileSheet(); },
  'open-sync': () => openSheet(syncSheetView(getStatus(), getSyncCode())),
  'sync-new': () => { connect(newCode()); refreshSyncSheet(); },
  'sync-now': () => syncNow(),
  'sync-off': () => { disconnect(); refreshSyncSheet(); },
  'sync-copy': async () => {
    const code = prettyCode(getSyncCode());
    try { await navigator.clipboard.writeText(code); toast('Skopiowano kod'); } catch { toast(code); }
  },
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
  'toggle-vhard': (el) => {
    const h = el.dataset.h;
    const on = !isVHard(h);
    setVHard(h, on);
    afterToggle(h, on ? `${h} oznaczono jako bardzo trudny` : `${h} nie jest już bardzo trudny`);
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
  'start-quiz': () => startQuiz(quizDeck(quizCount(ui)), ui.quizMode),
  'quiz-mode': (el) => { ui.quizMode = el.dataset.m; render({ keepScroll: true }); },
  'listen-type': (el) => { ui.listenType = el.dataset.m; render({ keepScroll: true }); },
  'listen-pick': (el) => listenPick(Number(el.dataset.i)),
  'listen-play': () => speakMsg(speak(Q.deck[Q.i].hanzi)),
  'listen-slow': () => speakMsg(speak(Q.deck[Q.i].hanzi, 0.5)),
  'write-undo': () => Q.pad?.undo(),
  'write-clear': () => Q.pad?.clear(),
  'write-check': writeCheck,
  'write-giveup': writeGiveUp,
  'write-verdict': (el) => writeVerdict(el.dataset.ok === '1'),
  'quiz-tone': (el) => setTone(Number(el.dataset.t)),
  'quiz-next': quizNext,
  'quiz-retry': () => startQuiz(Q.miss, Q.mode),
  'quiz-to-hard': () => {
    Q.miss.forEach((c) => { if (!isHard(c.hanzi)) toggleHard(c.hanzi); });
    toast('Dodano błędne znaki do trudnych');
  },
  'hard-level': (el) => { ui.hardLevel = Number(el.dataset.lv); render({ keepScroll: true }); },
  'hard-search': () => {
    ui.hardSearchOpen = !ui.hardSearchOpen;
    if (!ui.hardSearchOpen) ui.hardQuery = '';
    render({ keepScroll: true });
    if (ui.hardSearchOpen) $('#hq')?.focus({ preventScroll: true });
  },
  'study-due': () => startSession(dueDeck(), 'Nic do powtórki na dziś.'),
  'study-hard': () => {
    const mode = ui.hardMode || 'cards';
    if (mode === 'cards') return startSession(hardDeck(), 'Dodaj najpierw trudne fiszki.');
    startQuiz(hardCharDeck(), mode, 'Dodaj najpierw trudne znaki z bazy.');
  },
  'study-vhard': () => {
    const mode = ui.hardMode || 'cards';
    if (mode === 'cards') return startSession(vhardDeck(), 'Nie masz bardzo trudnych znaków.');
    startQuiz(vhardDeck(), mode, 'Nie masz bardzo trudnych znaków.');
  },
  'hard-mode': (el) => { ui.hardMode = el.dataset.m; render({ keepScroll: true }); },
  'learn-open': (el) => {
    const lv = Number(el.dataset.lv);
    if (!learnTodo(lv)) return toast('Wszystkie znaki z tego poziomu już znasz.');
    openSheet(learnSheetView(lv));
  },
  'learn-size': (el) => {
    setLearnPref({ size: el.dataset.n });
    const lv = Number(sheetEl.querySelector('#learn-go').dataset.lv);
    sheetEl.innerHTML = learnSheetView(lv);
    sheetEl.querySelector(el.dataset.n === 'custom' ? '#learn-n' : '#learn-go')?.focus({ preventScroll: true });
  },
  'learn-go': (el) => {
    const lv = Number(el.dataset.lv);
    const n = learnCount(lv);
    closeSheet();
    startSession(learnDeck(lv, n), 'Wszystkie znaki z tego poziomu już znasz.', 'learn');
  },
  'new-card': () => openSheet(formView()),
  'cf-toggle': (el) => {
    const h = el.dataset.h;
    toggleHard(h);
    $('#cf-results').innerHTML = cardResultsHTML($('#cf-q').value);
    toast(isHard(h) ? `${h} dodano do trudnych` : `${h} usunięto z trudnych`);
    render({ keepScroll: true });
  },
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
  if (e.target.id === 'profile-form') {
    e.preventDefault();
    setProfileName(e.target.dataset.id, new FormData(e.target).get('name'));
    closeSheet();
    toast('Zapisano profil');
    return;
  }
  if (e.target.id === 'sync-form') {
    e.preventDefault();
    const code = normalizeCode(new FormData(e.target).get('code'));
    if (!validCode(code)) return toast('Kod ma 12 znaków (litery i cyfry).');
    connect(code);
    refreshSyncSheet();
    return;
  }
  if (e.target.id !== 'card-form') return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const hanzi = (f.hanzi || '').trim();
  if (!hanzi) return toast('Wpisz znak albo wybierz go z wyników wyszukiwania.');
  addCustom({ hanzi, pinyin: f.pinyin.trim(), pl: f.pl.trim(), en: f.en.trim(), note: f.note.trim() });
  closeSheet();
  toast('Zapisano fiszkę');
  render({ keepScroll: true });
});

document.addEventListener('change', async (e) => {
  if (e.target.id !== 'av-file' || !e.target.files?.[0]) return;
  const id = sheetEl.querySelector('#profile-form')?.dataset.id;
  if (!id) return;
  try {
    setProfileAvatar(id, await fileToAvatar(e.target.files[0]));
    refreshProfileSheet();
  } catch (err) {
    toast(err.message || 'Nie udało się wczytać zdjęcia.');
  }
});

document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'kq') {
    ui.knownQuery = e.target.value;
    $('#known-grid').innerHTML = knownGridHTML(ui);
  } else if (id === 'cf-q') {
    $('#cf-results').innerHTML = cardResultsHTML(e.target.value);
  } else if (id === 'hq') {
    ui.hardQuery = e.target.value;
    $('#hard-grid').innerHTML = hardGridHTML(ui);
  } else if (id === 'learn-n') {
    setLearnPref({ custom: e.target.value });
    const go = $('#learn-go');
    if (go) go.textContent = `Zacznij (${learnCount(Number(go.dataset.lv))})`;
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
// Przy świeżym uruchomieniu najpierw ekran wyboru profilu; odświeżenie strony w trakcie sesji wraca od razu do profilu.
if (currentId()) {
  applyTheme();
  updateMe();
  render();
} else {
  updateMe();
  showPicker();
}
initSync();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline-cache opcjonalny */ });
}
