// Synchronizacja profili przez Firestore (REST, bez SDK i bez kont). Dwa telefony łączy kod parowania:
// dokumenty leżą w `rooms/<kod>/profiles/<asia|kuba>`, a kod (12 znaków, ok. 60 bitów) działa jak hasło.
// Dokument = { data: tekst JSON {name, avatar, state}, ts: liczba }. Zasady scalania opisane są w docs/ARCHITECTURE.md.
import { FIREBASE } from './config.js';
import { PROFILE_IDS, getRecord, putRecord, markBase, mergeState, getSyncCode, setSyncCode, onChange } from './store.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 12;

function config() {
  try {
    const o = JSON.parse(localStorage.getItem('bothanzi:fbcfg')); // nadpisanie do testów
    if (o?.projectId && o?.apiKey) return o;
  } catch { /* brak nadpisania */ }
  return FIREBASE;
}

// Zabezpieczenie przed literówkami przy wklejaniu kluczy (zbędny cudzysłów, spacja, nowa linia).
const clean = (v, re) => String(v || '').replace(re, '');
const projectId = () => clean(config().projectId, /[^a-z0-9-]/gi);
const apiKey = () => clean(config().apiKey, /[^A-Za-z0-9_-]/g);

export const syncConfigured = () => Boolean(projectId() && apiKey());

export function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(CODE_LEN));
  return [...b].map((x) => ALPHABET[x % ALPHABET.length]).join('');
}
export const normalizeCode = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[01OI]/g, '');
export const validCode = (c) => c.length === CODE_LEN && [...c].every((ch) => ALPHABET.includes(ch));
export const prettyCode = (c) => c.match(/.{1,4}/g)?.join('-') || '';

// ——— Status (dla arkusza „Synchronizacja”) ———
let status = { state: 'off', at: 0, msg: '' }; // off | idle | syncing | ok | error
const statusListeners = new Set();
const setStatus = (s) => { status = { ...status, ...s }; statusListeners.forEach((fn) => fn(status)); };
export const getStatus = () => status;
export const onStatus = (fn) => statusListeners.add(fn);

// ——— REST ———
const docUrl = (id, mask = '') => {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents/rooms/${getSyncCode()}/profiles/${id}?key=${apiKey()}${mask}`;
};

async function call(url, init) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  try { return await fetch(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}

async function fetchRemote(id) {
  const res = await call(docUrl(id));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(res.status === 403 ? 'Baza odrzuciła zapytanie (reguły lub klucz). Sprawdź docs/FIREBASE.md.' : `Błąd serwera (${res.status}).`);
  const f = (await res.json()).fields || {};
  const ts = Number(f.ts?.integerValue ?? 0);
  const body = JSON.parse(f.data?.stringValue || '{}');
  return { name: body.name, avatar: body.avatar ?? null, state: body.state || {}, ts };
}

async function pushRemote(id, rec) {
  const body = {
    fields: {
      data: { stringValue: JSON.stringify({ name: rec.name, avatar: rec.avatar, state: rec.state }) },
      ts: { integerValue: String(rec.ts) },
    },
  };
  const res = await call(docUrl(id, '&updateMask.fieldPaths=data&updateMask.fieldPaths=ts'), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.status === 403 ? 'Baza odrzuciła zapis (reguły lub klucz). Sprawdź docs/FIREBASE.md.' : `Błąd zapisu (${res.status}).`);
}

// ——— Jeden profil: porównanie wersji ———
// base = wersja, o której wiemy, że jest w chmurze. A: brak w chmurze → wyślij. B: chmura bez zmian → wyślij nasze zmiany.
// C: chmura się zmieniła → bez zmian lokalnych bierzemy chmurę, inaczej scalamy i wysyłamy wynik.
async function syncProfile(id) {
  const local = getRecord(id);
  const remote = await fetchRemote(id);
  if (!remote) {
    if (local.ts > 0) { await pushRemote(id, local); markBase(id, local.ts); }
    return;
  }
  if (remote.ts === local.base) {
    if (local.ts > local.base) { await pushRemote(id, local); markBase(id, local.ts); }
    return;
  }
  if (local.ts <= local.base) {
    putRecord(id, { ...remote, name: remote.name || local.name, base: remote.ts });
    return;
  }
  const ts = Math.max(local.ts, remote.ts) + 1;
  const newerRemote = remote.ts > local.ts;
  const merged = {
    name: (newerRemote ? remote.name : local.name) || local.name,
    avatar: newerRemote ? remote.avatar : local.avatar,
    state: mergeState(local.state, remote.state, local.ts, remote.ts),
    ts,
    base: 0,
  };
  await pushRemote(id, merged);
  putRecord(id, { ...merged, base: ts });
}

let running = false;
let again = false;

export async function syncNow() {
  if (!syncConfigured() || !getSyncCode()) { setStatus({ state: 'off' }); return false; }
  if (running) { again = true; return false; }
  running = true;
  setStatus({ state: 'syncing' });
  try {
    for (const id of PROFILE_IDS) await syncProfile(id);
    setStatus({ state: 'ok', at: Date.now(), msg: '' });
    return true;
  } catch (e) {
    const offline = !navigator.onLine || e.name === 'AbortError' || e instanceof TypeError;
    setStatus({ state: 'error', msg: offline ? 'Brak połączenia. Spróbuję ponownie, gdy wróci internet.' : e.message });
    return false;
  } finally {
    running = false;
    if (again) { again = false; setTimeout(syncNow, 300); }
  }
}

export function connect(code) {
  setSyncCode(code);
  setStatus({ state: 'idle', msg: '' });
  return syncNow();
}

export function disconnect() {
  setSyncCode('');
  setStatus({ state: 'off', msg: '' });
}

// ——— Uruchomienie: start, zmiany lokalne (z opóźnieniem), powrót do aplikacji, internet wrócił, odpytywanie co 90 s ———
export function initSync() {
  let timer;
  setStatus({ state: getSyncCode() && syncConfigured() ? 'idle' : 'off' });
  onChange((kind) => {
    if (kind !== 'local') return;
    clearTimeout(timer);
    timer = setTimeout(syncNow, 3500);
  });
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); syncNow(); }); // wejście: pobierz zmiany, wyjście: wyślij od razu
  addEventListener('online', syncNow);
  setInterval(() => { if (!document.hidden) syncNow(); }, 90000);
  syncNow();
}
