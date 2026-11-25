// Prosty system Leitnera: 5 pudełek, im wyższe, tym rzadziej karta wraca.
import { CHARS, BY_HANZI } from './data.js';
import { state, save, dayStamp, isKnown } from './store.js';

const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35]; // indeks = numer pudełka

export const VHARD_RUN = 3; // tyle błędów z rzędu robi ze znaku „bardzo trudny”

// Zwraca 'vhard', gdy ta ocena właśnie zrobiła ze znaku „bardzo trudny” (aplikacja pokazuje wtedy komunikat).
export function grade(key, ok) {
  const cur = state.srs[key] || { box: 1 };
  const box = ok ? Math.min(5, cur.box + 1) : 1;
  state.srs[key] = { box, due: dayStamp(INTERVAL_DAYS[box]) };
  let res = null;
  if (BY_HANZI.has(key)) {
    if (ok) delete state.missRun[key];
    else {
      state.missRun[key] = (state.missRun[key] || 0) + 1;
      if (state.missRun[key] >= VHARD_RUN && !state.vhard.includes(key)) {
        if (!state.hard.includes(key)) state.hard = [...state.hard, key];
        state.vhard = [...state.vhard, key];
        res = 'vhard';
      }
    }
  }
  save();
  return res;
}

function fromChar(c) {
  return { key: c.hanzi, hanzi: c.hanzi, pinyin: c.pinyin, en: c.en, pl: c.pl, hsk: c.hsk, note: '' };
}

function fromCustom(c) {
  return { key: 'c:' + c.id, hanzi: c.hanzi, pinyin: c.pinyin, en: c.en, pl: c.pl, hsk: 0, note: c.note || '' };
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dueDeck() {
  const today = dayStamp();
  return shuffle(
    CHARS.filter((c) => isKnown(c.hanzi) && (state.srs[c.hanzi]?.due ?? today) <= today).map(fromChar)
  );
}

// Generator talii z „Znanych”: opcjonalnie jeden poziom HSK i limit liczby kart.
export function knownDeck({ level = null, size = 20 } = {}) {
  const pool = CHARS.filter((c) => isKnown(c.hanzi) && (!level || c.hsk === level));
  return shuffle(pool).slice(0, size).map(fromChar);
}

export function knownCount(level = null) {
  return CHARS.filter((c) => isKnown(c.hanzi) && (!level || c.hsk === level)).length;
}

// Talia „trudnych”: znaki z bazy oznaczone przez użytkownika + własne fiszki.
export function hardDeck() {
  const own = state.hard.map((h) => BY_HANZI.get(h)).filter(Boolean).map(fromChar);
  return shuffle([...own, ...state.custom.map(fromCustom)]);
}

// Trudne do quizu ze słuchu i pisania: tylko znaki z bazy (potrzebny głos, dystraktory i kreski).
// Własna fiszka trafia tu, gdy jej znak jest w bazie; ocena idzie wtedy na sam znak.
export function hardCharDeck() {
  const set = new Set(state.hard.filter((h) => BY_HANZI.has(h)));
  state.custom.forEach((c) => { if (BY_HANZI.has(c.hanzi)) set.add(c.hanzi); });
  return shuffle([...set].map((h) => fromChar(BY_HANZI.get(h))));
}

// Same „bardzo trudne” (znaki z bazy), dla fiszek i quizów.
export function vhardDeck() {
  return shuffle(state.vhard.filter((h) => BY_HANZI.has(h)).map((h) => fromChar(BY_HANZI.get(h))));
}

export function hardCount() {
  return state.hard.filter((h) => BY_HANZI.has(h)).length + state.custom.length;
}

export function customAsItems() {
  return state.custom.map(fromCustom);
}

// Tryb „Ucz się nowych”: nieznane znaki z jednego poziomu, w kolejności z bazy, max `size` kart.
export function learnDeck(level, size = 20) {
  return CHARS.filter((c) => c.hsk === level && !isKnown(c.hanzi)).slice(0, size).map(fromChar);
}

// Quiz: losowe znane znaki.
export function quizDeck(size) {
  return knownDeck({ size });
}
