// Stan aplikacji w localStorage. Jedno źródło prawdy: `state`.
// known:    { [hanzi]: timestamp }              znaki opanowane
// hard:     [hanzi]                              znaki z bazy dodane do „trudnych”
// custom:   [{ id, hanzi, pinyin, en, pl, note }] własne fiszki
// srs:      { [key]: { box, due } }              powtórki (key = hanzi lub „c:<id>”)
// activity: { 'YYYY-MM-DD': liczba ocenionych kart }
// theme:    'auto' | 'light' | 'dark'
// showTr:   czy pokazywać tłumaczenie zdań przykładowych (ikona tłumacza w rogu zdania)

const KEY = 'bothanzi:v1';

const defaults = () => ({ known: {}, hard: [], custom: [], srs: {}, activity: {}, theme: 'auto', showTr: false });

function load() {
  try {
    return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return defaults();
  }
}

export const state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* tryb prywatny / brak miejsca */ }
}

export function dayStamp(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('sv-SE'); // YYYY-MM-DD w czasie lokalnym
}

export function isKnown(h) { return Boolean(state.known[h]); }
export function isHard(h) { return state.hard.includes(h); }

export function toggleKnown(h) {
  if (state.known[h]) {
    delete state.known[h];
  } else {
    state.known[h] = Date.now();
    state.srs[h] ??= { box: 1, due: dayStamp(1) };
  }
  save();
}

export function toggleHard(h) {
  state.hard = isHard(h) ? state.hard.filter((x) => x !== h) : [...state.hard, h];
  save();
}

export function addCustom(card) {
  state.custom.push({ id: Date.now().toString(36), ...card });
  save();
}

export function removeCustom(id) {
  state.custom = state.custom.filter((c) => c.id !== id);
  delete state.srs['c:' + id];
  save();
}

export function logActivity(n = 1) {
  const k = dayStamp();
  state.activity[k] = (state.activity[k] || 0) + n;
  save();
}

export function streak() {
  let n = 0;
  // Dzisiejszy brak aktywności nie przerywa serii, jeśli wczoraj była.
  let offset = state.activity[dayStamp()] ? 0 : -1;
  while (state.activity[dayStamp(offset)]) { n++; offset--; }
  return n;
}

export function setShowTr(v) {
  state.showTr = Boolean(v);
  save();
}

export function setTheme(t) {
  state.theme = t;
  save();
}
