// GENEROWANE przez tools/gen-themes.py: nie edytuj ręcznie.
// Rodziny kolorystyczne (każda ma tryb ciemny i jasny). Wartości zmiennych są w css/themes.css (<html data-theme="rodzina-tryb">).
// sw: kolejno tło, powierzchnia, akcent, złoto (kropki podglądu); meta: kolor paska przeglądarki (theme-color).
export const FAMILIES = [
  {
    "id": "las",
    "name": "Las",
    "note": "Zielony i różowy",
    "group": "pink",
    "sw": {
      "dark": [
        "#0c1713",
        "#142620",
        "#f0829a",
        "#d9b36c"
      ],
      "light": [
        "#edf0e8",
        "#f9faf6",
        "#c92c61",
        "#b08a3e"
      ]
    },
    "meta": {
      "dark": "#0c1713",
      "light": "#edf0e8"
    }
  },
  {
    "id": "herbata",
    "name": "Herbata",
    "note": "Ciepły brąz i róż",
    "group": "pink",
    "sw": {
      "dark": [
        "#17110c",
        "#211912",
        "#f08a9e",
        "#e8c98a"
      ],
      "light": [
        "#f6efe3",
        "#fffaf1",
        "#c23a5c",
        "#a8772a"
      ]
    },
    "meta": {
      "dark": "#17110c",
      "light": "#f6efe3"
    }
  },
  {
    "id": "zmierzch",
    "name": "Zmierzch",
    "note": "Granat i róż",
    "group": "pink",
    "sw": {
      "dark": [
        "#0a1220",
        "#111c30",
        "#ff8aa6",
        "#e6c88f"
      ],
      "light": [
        "#eef2f8",
        "#fafcff",
        "#d0306a",
        "#9a7a3a"
      ]
    },
    "meta": {
      "dark": "#0a1220",
      "light": "#eef2f8"
    }
  },
  {
    "id": "noc",
    "name": "Noc",
    "note": "Czerń i róż",
    "group": "pink",
    "sw": {
      "dark": [
        "#0b0b0c",
        "#151516",
        "#ec8c9f",
        "#d9b36c"
      ],
      "light": [
        "#f6f2ea",
        "#fffdf8",
        "#b83b5e",
        "#a8842f"
      ]
    },
    "meta": {
      "dark": "#0b0b0c",
      "light": "#f6f2ea"
    }
  },
  {
    "id": "tusz",
    "name": "Tusz",
    "note": "Grafit i róż",
    "group": "pink",
    "sw": {
      "dark": [
        "#0f1214",
        "#181c1f",
        "#f2849c",
        "#e0b866"
      ],
      "light": [
        "#f1ece1",
        "#faf7f0",
        "#c2305a",
        "#a67c2e"
      ]
    },
    "meta": {
      "dark": "#0f1214",
      "light": "#f1ece1"
    }
  },
  {
    "id": "bursztyn",
    "name": "Bursztyn",
    "note": "Miód i herbata",
    "group": "own",
    "sw": {
      "dark": [
        "#17110c",
        "#211912",
        "#e9a94a",
        "#e8c98a"
      ],
      "light": [
        "#f6efe3",
        "#fffaf1",
        "#a85f0c",
        "#8f6a1f"
      ]
    },
    "meta": {
      "dark": "#17110c",
      "light": "#f6efe3"
    }
  },
  {
    "id": "granat",
    "name": "Granat z koralem",
    "note": "Głęboki granat i koral",
    "group": "own",
    "sw": {
      "dark": [
        "#0a1220",
        "#111c30",
        "#f5806f",
        "#e6c88f"
      ],
      "light": [
        "#eef2f8",
        "#fafcff",
        "#c9432f",
        "#9a7a3a"
      ]
    },
    "meta": {
      "dark": "#0a1220",
      "light": "#eef2f8"
    }
  },
  {
    "id": "luxury",
    "name": "Luxury",
    "note": "Czerń i złoto",
    "group": "own",
    "sw": {
      "dark": [
        "#0b0b0c",
        "#151516",
        "#d9b36c",
        "#f0d9a0"
      ],
      "light": [
        "#f6f2ea",
        "#fffdf8",
        "#8f6a1c",
        "#8a6a1c"
      ]
    },
    "meta": {
      "dark": "#0b0b0c",
      "light": "#f6f2ea"
    }
  },
  {
    "id": "cynober",
    "name": "Tusz i cynober",
    "note": "Papier i czerwień",
    "group": "own",
    "sw": {
      "dark": [
        "#141211",
        "#1d1a18",
        "#e85a42",
        "#e0b866"
      ],
      "light": [
        "#f1ece1",
        "#faf7f0",
        "#b8321f",
        "#a67c2e"
      ]
    },
    "meta": {
      "dark": "#141211",
      "light": "#f1ece1"
    }
  }
];

const IDS = new Set(FAMILIES.map((f) => f.id));
export const MODES = [['auto', 'Auto'], ['dark', 'Ciemny'], ['light', 'Jasny']];

// Starsze wartości ustawienia `theme` (przed v0.14) → [rodzina, tryb].
const LEGACY = { las: ['las', 'dark'], poranek: ['las', 'light'], bursztyn: ['bursztyn', 'dark'], granat: ['granat', 'dark'],
  luxury: ['luxury', 'dark'], cynober: ['cynober', 'light'], dark: ['las', 'dark'], light: ['las', 'light'], auto: ['las', 'auto'] };

// Zwraca { theme, mode } z zapisanego stanu; jeśli `themeMode` nie istnieje, migruje stare ustawienie.
export function normalizeTheme(theme, mode) {
  if (!mode && LEGACY[theme]) [theme, mode] = LEGACY[theme];
  if (!IDS.has(theme)) theme = 'las';
  if (!['auto', 'dark', 'light'].includes(mode)) mode = 'auto';
  return { theme, mode };
}

export const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
export const effectiveMode = (mode) => (mode === 'auto' ? (systemDark() ? 'dark' : 'light') : mode);
export const themeAttr = (theme, mode) => `${theme}-${effectiveMode(mode)}`;
export const themeMeta = (theme, mode) => (FAMILIES.find((f) => f.id === theme) || FAMILIES[0]).meta[effectiveMode(mode)];
