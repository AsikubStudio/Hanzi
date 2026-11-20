import { BY_HANZI } from './data.js';
import { state, toggleKnown, toggleHard, addCustom, removeCustom, logActivity, setTheme } from './store.js';
import { grade, dueDeck, knownDeck, hardDeck } from './srs.js';
import { search } from './search.js';
import {
  tabbarHTML, homeView, knownView, discoverView, cardsView, searchView, resultsHTML,
  sheetView, formView, sessionView, summaryView,
} from './ui.js';

const $ = (sel) => document.querySelector(sel);
const view = $('#view');
const tabbar = $('#tabbar');
const sheetEl = $('#sheet');
const sessionEl = $('#session');
const toastEl = $('#toast');

const ui = {
  tab: 'home',
  knownLevel: 0,
  openTiers: new Set(),
  tiersTouched: false,
  deckSize: 20,
  deckLevel: 0,
  query: '',
  results: [],
};

const VIEWS = { home: homeView, known: knownView, discover: discoverView, cards: cardsView, search: searchView };

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
  render();
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
});

// ——— Motyw ———
function applyTheme() {
  const root = document.documentElement;
  if (state.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', state.theme);
  const dark = state.theme === 'dark' || (state.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#0b1612' : '#123026');
}

function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  setTheme(order[(order.indexOf(state.theme) + 1) % order.length]);
  applyTheme();
  toast({ auto: 'Motyw: zgodny z systemem', light: 'Motyw: jasny', dark: 'Motyw: ciemny' }[state.theme]);
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
  lastFocus = document.activeElement;
  sheetEl.innerHTML = html;
  sheetEl.hidden = false;
  requestAnimationFrame(() => sheetEl.classList.add('open'));
  sheetEl.querySelector('input,button.btn')?.focus({ preventScroll: true });
}

function closeSheet() {
  sheetEl.classList.remove('open');
  setTimeout(() => { sheetEl.hidden = true; sheetEl.innerHTML = ''; }, 180);
  lastFocus?.focus?.({ preventScroll: true });
}

function openChar(h) {
  const c = BY_HANZI.get(h);
  if (c) openSheet(sheetView(c));
}

// ——— Sesja fiszek ———
let S = null;

function startSession(deck, emptyMsg) {
  if (!deck.length) return toast(emptyMsg);
  S = { deck, i: 0, flipped: false, hit: 0, miss: [], done: false };
  sessionEl.hidden = false;
  document.body.classList.add('in-session');
  drawSession();
}

function drawSession() {
  sessionEl.innerHTML = S.done ? summaryView(S) : sessionView(S);
  if (!S.done) bindCard();
}

function endSession() {
  S = null;
  sessionEl.hidden = true;
  sessionEl.innerHTML = '';
  document.body.classList.remove('in-session');
  render({ keepScroll: true });
}

function answer(ok) {
  if (!S || S.done) return;
  const c = S.deck[S.i];
  grade(c.key, ok);
  logActivity();
  if (ok) S.hit++; else S.miss.push(c);
  S.flipped = false;
  S.i++;
  if (S.i >= S.deck.length) S.done = true;
  drawSession();
}

function bindCard() {
  const card = $('#card');
  if (!card) return;
  let startX = 0, dx = 0, drag = false, moved = false;

  const flip = () => {
    S.flipped = !S.flipped;
    card.classList.toggle('is-flipped', S.flipped);
  };

  card.addEventListener('pointerdown', (e) => {
    drag = true; moved = false; startX = e.clientX; dx = 0;
    card.setPointerCapture(e.pointerId);
    card.classList.add('dragging');
  });
  card.addEventListener('pointermove', (e) => {
    if (!drag) return;
    dx = e.clientX - startX;
    if (Math.abs(dx) > 6) moved = true;
    card.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
    card.dataset.dir = dx > 24 ? 'yes' : dx < -24 ? 'no' : '';
    card.style.setProperty('--pull', Math.min(1, Math.abs(dx) / 110));
  });
  const release = () => {
    if (!drag) return;
    drag = false;
    card.classList.remove('dragging');
    if (Math.abs(dx) > 100) {
      const ok = dx > 0;
      card.style.transition = 'transform .18s ease-in, opacity .18s';
      card.style.transform = `translateX(${ok ? 520 : -520}px) rotate(${ok ? 18 : -18}deg)`;
      card.style.opacity = '0';
      setTimeout(() => answer(ok), 170);
    } else {
      card.style.transform = '';
      card.dataset.dir = '';
      card.style.setProperty('--pull', 0);
      if (!moved) flip();
    }
  };
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);
  card.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!sheetEl.hidden) closeSheet();
    else if (S) endSession();
  }
  if (S && !S.done) {
    if (e.key === 'ArrowRight') answer(true);
    if (e.key === 'ArrowLeft') answer(false);
  }
});

// ——— Akcje (delegacja zdarzeń) ———
const ACTIONS = {
  open: (el) => openChar(el.dataset.h),
  'close-sheet': closeSheet,
  theme: cycleTheme,
  'toggle-known': (el) => {
    const h = el.dataset.h;
    toggleKnown(h);
    toast(state.known[h] ? `Dodano ${h} do znanych` : `Usunięto ${h} ze znanych`);
    openChar(h);
    render({ keepScroll: true });
  },
  'toggle-hard': (el) => {
    const h = el.dataset.h;
    toggleHard(h);
    toast(state.hard.includes(h) ? `Dodano ${h} do trudnych` : `Usunięto ${h} z trudnych`);
    openChar(h);
    render({ keepScroll: true });
  },
  'known-level': (el) => { ui.knownLevel = Number(el.dataset.lv); render({ keepScroll: true }); },
  'deck-level': (el) => { ui.deckLevel = Number(el.dataset.lv); render({ keepScroll: true }); },
  'deck-size': (el) => { ui.deckSize = Number(el.dataset.n); render({ keepScroll: true }); },
  'study-known': () => startSession(knownDeck({ level: ui.deckLevel || null, size: ui.deckSize }), 'Brak znanych znaków w tym poziomie.'),
  'study-due': () => startSession(dueDeck(), 'Nic do powtórki na dziś.'),
  'study-hard': () => startSession(hardDeck(), 'Dodaj najpierw trudne fiszki.'),
  'new-card': () => openSheet(formView()),
  'del-custom': (el) => { removeCustom(el.dataset.id); toast('Usunięto fiszkę'); render({ keepScroll: true }); },
  answer: (el) => answer(el.dataset.ok === '1'),
  'end-session': endSession,
  'retry-missed': () => {
    const deck = S.miss;
    S = { deck, i: 0, flipped: false, hit: 0, miss: [], done: false };
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

// Wyszukiwanie: aktualizujemy tylko listę wyników, żeby nie gubić fokusu w polu.
document.addEventListener('input', (e) => {
  if (e.target.id !== 'q') return;
  ui.query = e.target.value;
  ui.results = search(ui.query);
  $('#results').innerHTML = resultsHTML(ui.results, ui.query);
});

// <details> nie bąbelkuje zdarzenia toggle, więc łapiemy je w fazie przechwytywania.
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!d.matches?.('details.tier')) return;
  ui.tiersTouched = true;
  const n = Number(d.dataset.lv);
  if (d.open) ui.openTiers.add(n); else ui.openTiers.delete(n);
}, true);

// ——— Start ———
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline-cache opcjonalny */ });
}
