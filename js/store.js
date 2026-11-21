// Stan aplikacji w localStorage. Jedno źródło prawdy: `state`.
// known:    { [hanzi]: timestamp }              znaki opanowane
// hard:     [hanzi]                              znaki z bazy dodane do „trudnych”
// custom:   [{ id, hanzi, pinyin, en, pl, note }] własne fiszki
// srs:      { [key]: { box, due } }              powtórki (key = hanzi lub „c:<id>”)
// activity: { 'YYYY-MM-DD': liczba ocenionych kart }
// theme:    id rodziny kolorystycznej z js/themes.js ('las', 'herbata', 'zmierzch', 'noc', 'tusz', 'bursztyn', 'granat', 'luxury', 'cynober')
// themeMode: 'auto' | 'dark' | 'light' (null = starszy zapis; migracja w js/themes.js)
// log:      { 'YYYY-MM-DD': { r: powtórki, g: oceny do retencji, ok: poprawne, t: czas nauki w ms } }
// showTr:   czy pokazywać tłumaczenie zdań przykładowych (ikona tłumacza w rogu zdania)
// learnPref: { size: '5'|'10'|'15'|'custom', custom: liczba } ostatni wybór liczby znaków w „Ucz się nowych”

// Profile: dwie osoby (Asia, Kuba), każda z własnym stanem (jak wyżej) + nazwą i zdjęciem.
// localStorage `bothanzi:v2` = { v:2, profiles:{ asia:{ name, avatar, state, ts, base }, kuba:{…} }, sync:{ code }, legacy }.
//   ts   = czas ostatniej zmiany lokalnej, base = ts wersji, o której wiemy, że jest już w chmurze (patrz js/sync.js),
//   legacy = postęp z wersji sprzed profili (`bothanzi:v1`), czeka na przypisanie do profilu.
// `state` to roboczy stan AKTYWNEGO profilu (obiekt zmieniany w miejscu przy zmianie profilu). Aktywny profil żyje w sessionStorage,
// więc po świeżym uruchomieniu aplikacji wraca ekran wyboru, a odświeżenie strony w trakcie sesji go nie wywołuje.
// `bothanzi:ui` = { theme, themeMode } aktywnego profilu, czytane przez skrypt w <head> (motyw przed pierwszym malowaniem).

const KEY = 'bothanzi:v2';
const LEGACY_KEY = 'bothanzi:v1';
const UI_KEY = 'bothanzi:ui';
const ME_KEY = 'bothanzi:me';
const LAST_KEY = 'bothanzi:last';

export const PROFILE_IDS = ['asia', 'kuba'];
const NAMES = { asia: 'Asia', kuba: 'Kuba' };

const defaults = () => ({ known: {}, hard: [], custom: [], srs: {}, activity: {}, log: {}, theme: 'las', themeMode: null, showTr: false, learnPref: { size: '10', custom: 12 } });
const clone = (o) => JSON.parse(JSON.stringify(o));
const emptyRec = (id) => ({ name: NAMES[id], avatar: null, state: defaults(), ts: 0, base: 0 });
const hasProgress = (s) => Boolean(s && (Object.keys(s.known || {}).length || (s.custom || []).length || Object.keys(s.activity || {}).length || (s.hard || []).length));

function loadDb() {
  const db = { v: 2, profiles: {}, sync: { code: '' }, legacy: null };
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch { /* uszkodzony zapis */ }
  for (const id of PROFILE_IDS) {
    const r = raw?.profiles?.[id] || {};
    db.profiles[id] = { ...emptyRec(id), ...r, state: { ...defaults(), ...(r.state || {}) } };
  }
  if (raw?.v === 2) {
    db.sync = { code: '', ...(raw.sync || {}) };
    db.legacy = raw.legacy || null;
  } else {
    try {
      const old = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (hasProgress(old)) db.legacy = { ...defaults(), ...old };
    } catch { /* brak starego zapisu */ }
  }
  return db;
}

const db = loadDb();
export const state = defaults();
let me = null;
const listeners = new Set();

function replaceState(src) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, defaults(), clone(src));
}

function persist() {
  try {
    if (me) db.profiles[me].state = state;
    localStorage.setItem(KEY, JSON.stringify(db));
    if (me) localStorage.setItem(UI_KEY, JSON.stringify({ theme: state.theme, themeMode: state.themeMode }));
  } catch { /* tryb prywatny / brak miejsca */ }
}

// kind: 'local' (zmiana zrobiona na tym urządzeniu → trzeba wysłać do chmury) | 'remote' (przyszły dane z chmury → odśwież widok)
function emit(kind) { listeners.forEach((fn) => fn(kind)); }
export function onChange(fn) { listeners.add(fn); }

export function save() {
  if (me) db.profiles[me].ts = Date.now();
  persist();
  emit('local');
}

// ——— Profile ———
export const currentId = () => me;

export function selectProfile(id) {
  if (!PROFILE_IDS.includes(id)) return false;
  if (me) db.profiles[me].state = clone(state);
  me = id;
  replaceState(db.profiles[id].state);
  db.profiles[id].state = state;
  try { sessionStorage.setItem(ME_KEY, id); localStorage.setItem(LAST_KEY, id); } catch { /* ignoruj */ }
  persist();
  return true;
}

export function leaveProfile() {
  if (!me) return;
  db.profiles[me].state = clone(state);
  me = null;
  try { sessionStorage.removeItem(ME_KEY); } catch { /* ignoruj */ }
  persist();
}

export function profileInfo(id) { const r = db.profiles[id]; return { id, name: r.name, avatar: r.avatar }; }
export const profileList = () => PROFILE_IDS.map(profileInfo);
export const peerState = (id) => (id === me ? state : db.profiles[id].state);
export const knownCountOf = (id) => Object.keys(peerState(id).known || {}).length;

export function setProfileName(id, name) {
  db.profiles[id].name = String(name).trim().slice(0, 16) || NAMES[id];
  db.profiles[id].ts = Date.now();
  persist();
  emit('local');
}

export function setProfileAvatar(id, dataUrl) {
  db.profiles[id].avatar = dataUrl || null;
  db.profiles[id].ts = Date.now();
  persist();
  emit('local');
}

// Kto ma znak: lista profili, w których jest „znany” lub „trudny” (trudny ma pierwszeństwo: obwódka na czerwono).
export function whoHas(h) {
  return PROFILE_IDS.flatMap((id) => {
    const s = peerState(id);
    const hard = (s.hard || []).includes(h);
    return hard || s.known?.[h] ? [{ ...profileInfo(id), hard }] : [];
  });
}

// ——— Postęp sprzed profili ———
export const legacyCount = () => (db.legacy ? Object.keys(db.legacy.known || {}).length : 0);
export const hasLegacy = () => Boolean(db.legacy);

export function adoptLegacy(id) {
  if (!db.legacy) return;
  const rec = db.profiles[id];
  const cur = id === me ? state : rec.state;
  const next = hasProgress(cur) ? mergeState(cur, db.legacy, 0, 1) : { ...defaults(), ...db.legacy };
  if (id === me) replaceState(next); else rec.state = next;
  rec.ts = Date.now();
  db.legacy = null;
  persist();
  emit('local');
}

export function dropLegacy() {
  db.legacy = null;
  persist();
}

// ——— Scalanie dwóch wersji tego samego profilu (zmiany na dwóch urządzeniach) ———
// Znane, trudne i własne fiszki: suma. SRS: dalsze pudełko wygrywa. Aktywność i log: większa wartość dnia.
// Pola pojedyncze (motyw itd.): wersja o nowszym `ts`.
export function mergeState(a, b, tsA, tsB) {
  const newer = tsB > tsA ? b : a;
  const out = { ...defaults(), ...clone(newer) };
  out.known = { ...(b.known || {}), ...(a.known || {}) };
  for (const h of Object.keys(out.known)) out.known[h] = Math.max(a.known?.[h] || 0, b.known?.[h] || 0);
  out.hard = [...new Set([...(a.hard || []), ...(b.hard || [])])];
  const ids = new Set();
  out.custom = [...(a.custom || []), ...(b.custom || [])].filter((c) => !ids.has(c.id) && ids.add(c.id));
  out.srs = { ...(b.srs || {}), ...(a.srs || {}) };
  for (const k of Object.keys(out.srs)) {
    const x = a.srs?.[k], y = b.srs?.[k];
    if (x && y) out.srs[k] = (y.box > x.box || (y.box === x.box && y.due > x.due)) ? y : x;
  }
  out.activity = { ...(b.activity || {}), ...(a.activity || {}) };
  for (const k of Object.keys(out.activity)) out.activity[k] = Math.max(a.activity?.[k] || 0, b.activity?.[k] || 0);
  out.log = { ...(b.log || {}), ...(a.log || {}) };
  for (const k of Object.keys(out.log)) {
    const x = a.log?.[k], y = b.log?.[k];
    if (x && y) out.log[k] = y.r > x.r ? y : x;
  }
  return out;
}

// ——— Dostęp dla synchronizacji (js/sync.js) ———
export function getRecord(id) {
  const r = db.profiles[id];
  return { name: r.name, avatar: r.avatar, state: id === me ? state : r.state, ts: r.ts, base: r.base };
}

// Podmienia profil wersją z chmury albo po scaleniu; nie podbija ts i nie wywołuje wysyłki.
export function putRecord(id, next) {
  const r = db.profiles[id];
  Object.assign(r, { name: next.name, avatar: next.avatar, ts: next.ts, base: next.base });
  if (id === me) { replaceState(next.state); r.state = state; } else r.state = { ...defaults(), ...clone(next.state) };
  persist();
  emit('remote');
}

export function markBase(id, base) {
  db.profiles[id].base = base;
  persist();
}

export const getSyncCode = () => db.sync.code || '';
export function setSyncCode(code) {
  db.sync.code = code || '';
  persist();
}

{ // powrót do profilu z tej sesji (odświeżenie strony); świeże uruchomienie zawsze pokazuje wybór profilu
  let saved = null;
  try {
    saved = sessionStorage.getItem(ME_KEY);
    localStorage.removeItem('bothanzi:remember'); // pozostałość po usuniętej opcji „Zapamiętaj profil”
  } catch { /* ignoruj */ }
  if (PROFILE_IDS.includes(saved)) selectProfile(saved);
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

const dayLog = (k) => (state.log[k] ||= { r: 0, g: 0, ok: 0, t: 0 });

// Jedna ocena karty. graded = karta liczy się do retencji (powtórki i quiz, nie tryb nauki); ok = zapamiętana.
export function logReview({ graded = false, ok = false } = {}) {
  const k = dayStamp();
  state.activity[k] = (state.activity[k] || 0) + 1;
  const d = dayLog(k);
  d.r++;
  if (graded) { d.g++; if (ok) d.ok++; }
  save();
}

// Czas aktywnej nauki (ms) dopisywany do dzisiejszego dnia.
export function logTime(ms) {
  if (!(ms > 0)) return;
  dayLog(dayStamp()).t += Math.round(ms);
  save();
}

// Statystyki dnia; dni sprzed wprowadzenia `log` mają tylko liczbę powtórek z `activity`.
export function dayStats(k) {
  const l = state.log[k] || { r: 0, g: 0, ok: 0, t: 0 };
  return { ...l, r: Math.max(l.r, state.activity[k] || 0) };
}

export function overallStats() {
  const keys = new Set([...Object.keys(state.log), ...Object.keys(state.activity)]);
  const o = { t: 0, r: 0, g: 0, ok: 0, days: 0 };
  for (const k of keys) {
    const d = dayStats(k);
    o.t += d.t; o.r += d.r; o.g += d.g; o.ok += d.ok;
    if (d.r > 0) o.days++;
  }
  return o;
}

export function streak() {
  let n = 0;
  // Dzisiejszy brak aktywności nie przerywa serii, jeśli wczoraj była.
  let offset = state.activity[dayStamp()] ? 0 : -1;
  while (state.activity[dayStamp(offset)]) { n++; offset--; }
  return n;
}

// Seria i aktywność dowolnego profilu (ekran wyboru, postęp drugiej osoby).
export function streakOf(id) {
  const act = peerState(id).activity || {};
  let n = 0;
  let offset = act[dayStamp()] ? 0 : -1;
  while (act[dayStamp(offset)]) { n++; offset--; }
  return n;
}
export const activeTodayOf = (id) => Boolean((peerState(id).activity || {})[dayStamp()]);

export function setLearnPref(p) {
  state.learnPref = { ...(state.learnPref || { size: '10', custom: 12 }), ...p };
  save();
}

export function setShowTr(v) {
  state.showTr = Boolean(v);
  save();
}

export function setTheme(t) {
  state.theme = t;
  save();
}

export function setThemeMode(m) {
  state.themeMode = m;
  save();
}
