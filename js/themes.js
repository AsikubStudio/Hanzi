// Pula motywów kolorystycznych. Wartości zmiennych leżą w css/themes.css (<html data-theme="id">);
// tu tylko lista do wyboru, podgląd w kafelkach i kolor paska przeglądarki (theme-color).
// sw: kolejno tło, powierzchnia, akcent, złoto/jasny akcent (kropki podglądu).
export const THEMES = [
  { id: 'las', name: 'Las nocą', note: 'Zielony i różowy, ciemny', sw: ['#0c1713', '#142620', '#f0829a', '#d9b36c'], meta: '#0c1713' },
  { id: 'poranek', name: 'Poranek w lesie', note: 'Zielony i różowy, jasny', sw: ['#edf0e8', '#f9faf6', '#c92c61', '#b08a3e'], meta: '#edf0e8' },
  { id: 'bursztyn', name: 'Bursztyn', note: 'Ciepły, herbaciany', sw: ['#17110c', '#211912', '#e9a94a', '#e8c98a'], meta: '#17110c' },
  { id: 'granat', name: 'Granat z koralem', note: 'Głęboki granat, koralowy akcent', sw: ['#0a1220', '#111c30', '#f5806f', '#e6c88f'], meta: '#0a1220' },
  { id: 'luxury', name: 'Luxury', note: 'Czerń i złoto', sw: ['#0b0b0c', '#151516', '#d9b36c', '#f0d9a0'], meta: '#0b0b0c' },
  { id: 'cynober', name: 'Tusz i cynober', note: 'Papier ryżowy i czerwień', sw: ['#f1ece1', '#faf7f0', '#b8321f', '#a67c2e'], meta: '#f1ece1' },
];

const IDS = new Set(THEMES.map((t) => t.id));

// Zapisana wartość → id motywu. Starsze ustawienia ('dark', 'light') i 'auto' (zgodnie z systemem) dostają odpowiednik.
export function resolveTheme(stored) {
  if (IDS.has(stored)) return stored;
  if (stored === 'dark') return 'las';
  if (stored === 'light') return 'poranek';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'las' : 'poranek';
}

export const themeMeta = (id) => (THEMES.find((t) => t.id === id) || THEMES[0]).meta;
