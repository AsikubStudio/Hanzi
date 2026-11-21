#!/usr/bin/env python3
"""Generuje css/themes.css i js/themes.js z jednej definicji rodzin kolorystycznych.

Użycie (z katalogu głównego projektu):  python3 tools/gen-themes.py
Każda rodzina ma wersję ciemną (d) i jasną (l). Powierzchnie „sceny” (hero, kafel serii, sesje) są w obu trybach ciemne
i zależą tylko od rodziny. Żeby dodać motyw, dopisz rodzinę do FAMILIES i uruchom skrypt.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Kolory UI: bg, sf (powierzchnia), sf2, ink, ink2, line, pink (akcent), soft (tło akcentu), moss, gold, track; onp = tekst na akcencie.
def ui(bg, sf, sf2, ink, ink2, line, pink, soft, moss, gold, track, onp):
    return dict(bg=bg, sf=sf, sf2=sf2, ink=ink, ink2=ink2, line=line, pink=pink, soft=soft, moss=moss, gold=gold, track=track, onp=onp)

FAMILIES = [
  # ——— różowy akcent ———
  dict(id='las', name='Las', note='Zielony i różowy', group='pink',
    d=ui('#0c1713','#142620','#1b3229','#f2f5f3','#9cb3aa','#233d34','#f0829a','#3a2230','#7fa387','#d9b36c','#264238','#0c1713'),
    l=ui('#edf0e8','#f9faf6','#e2e8dd','#14261f','#4b5e55','#d3dacd','#c92c61','#f7d3de','#4f7357','#b08a3e','#d3dacd','#ffffff'),
    stage=('#0d251c','#164332'), t3=('#11231c','#2c1a2b'), t4=('#170f20','#4b1839'), sess=('#1b4a39','#0d251c','#0a1d16'),
    g=('#0a1d16','#0e2e23','#123a2c','#1b4a39','#2c5d4a','#2f7d5e','#2a7356'), cloud='#bfe3cf', spruce='#123026',
    sun='#f0829a', btn_d=('#f28ba0','#d96b82'), btn_l=('#dc3f70','#b9264f'), onst='#0c1713',
    lamp=('#f07aa0','#ffd9e5','#b83a68','#5c1f3a','#ff8fb4','#ffb3cb'), off=('#173629','#6f9f8a','#5a8a75','#4d7b67'), cord='#7d9a8b',
    ink_st=('#f2f5f3','#b9cfc3','#9cb3aa'), goldst='#d9b36c', trackst='#264238'),
  dict(id='herbata', name='Herbata', note='Ciepły brąz i róż', group='pink',
    d=ui('#17110c','#211912','#2b2118','#f6efe4','#bba993','#3a2d20','#f08a9e','#40242a','#a3a874','#e8c98a','#3a2d20','#1b0f10'),
    l=ui('#f6efe3','#fffaf1','#ece2d0','#2a1d12','#6d5a45','#e0d3bc','#c23a5c','#f6d8de','#7a8048','#a8772a','#e0d3bc','#ffffff'),
    stage=('#1d140c','#3a2616'), t3=('#1f150d','#3a2224'), t4=('#1c110a','#5a2432'), sess=('#3a2616','#1d140c','#130c07'),
    g=('#140d07','#1d130a','#2a1b0f','#3a2616','#5a3a22','#7d8a45','#66723a'), cloud='#f1dfc0', spruce='#2a1b0f',
    sun='#f08a9e', btn_d=('#f4909f','#d9687c'), btn_l=('#d4406a','#b02a52'), onst='#1b0f10',
    lamp=('#f28a9b','#ffe0e4','#b8485c','#5c2330','#ff9aa8','#ffc0c8'), off=('#2a1d12','#8a6a44','#6b5236','#5c4630'), cord='#9a8365',
    ink_st=('#f6efe4','#dccdb4','#b9a78f'), goldst='#f0cf8a', trackst='#3d2f20'),
  dict(id='zmierzch', name='Zmierzch', note='Granat i róż', group='pink',
    d=ui('#0a1220','#111c30','#18253d','#eef2f8','#9aabc4','#223350','#ff8aa6','#35202e','#6f93b8','#e6c88f','#243756','#1a0a14'),
    l=ui('#eef2f8','#fafcff','#dfe6f1','#101a2e','#4a5a78','#cfd8e6','#d0306a','#f9d6e2','#4f7aa8','#9a7a3a','#cfd8e6','#ffffff'),
    stage=('#0b1730','#173057'), t3=('#101c33','#2e2040'), t4=('#160f26','#53204a'), sess=('#1b3a66','#0b1730','#070e1f'),
    g=('#081022','#0c1a33','#11264a','#1b3a66','#2c5688','#3f8fa0','#2f7686'), cloud='#c5d8f0', spruce='#0f1c36',
    sun='#ff8aa6', btn_d=('#ff94b0','#e0638a'), btn_l=('#d83a76','#b0225a'), onst='#1a0a14',
    lamp=('#ff7fa6','#ffdbe6','#c23a6a','#5a1f3a','#ff8fb8','#ffb3cb'), off=('#0f1f3a','#5f84b5','#46689a','#3f5f90'), cord='#6f88ad',
    ink_st=('#eef2f8','#c0cde2','#9aabc4'), goldst='#e6c88f', trackst='#243756'),
  dict(id='noc', name='Noc', note='Czerń i róż', group='pink',
    d=ui('#0b0b0c','#151516','#1e1e20','#f4efe6','#a8a193','#2e2b24','#ec8c9f','#33202a','#a89a6a','#d9b36c','#2e2b24','#1a0d10'),
    l=ui('#f6f2ea','#fffdf8','#ebe5d8','#1a1814','#645d50','#ddd5c4','#b83b5e','#f4d9df','#8a7a45','#a8842f','#ddd5c4','#ffffff'),
    stage=('#0c0c0d','#1c1a16'), t3=('#0f0e0d','#2a1a1c'), t4=('#0c0b0a','#44202c'), sess=('#26221a','#0f0e0c','#080808'),
    g=('#070707','#0e0e0f','#161514','#23201a','#3a3326','#8a7440','#6b5a34'), cloud='#e8d8ae', spruce='#15130e',
    sun='#ec8c9f', btn_d=('#f09aab','#cf6b82'), btn_l=('#c9456a','#a32a4d'), onst='#1a0d10',
    lamp=('#ee8fa0','#ffdfe5','#b6475f','#4d2029','#ff9fb0','#ffc4cd'), off=('#161512','#7d6d4a','#5a4e36','#4d4430'), cord='#8c7f60',
    ink_st=('#f4efe6','#cfc7b4','#a8a193'), goldst='#f0d9a0', trackst='#2f2b22'),
  dict(id='tusz', name='Tusz', note='Grafit i róż', group='pink',
    d=ui('#0f1214','#181c1f','#21262a','#f1f1ee','#a3adb1','#2c3338','#f2849c','#352029','#7d9a8f','#e0b866','#2c3338','#1a0b10'),
    l=ui('#f1ece1','#faf7f0','#e6dfd0','#1c1a17','#5a554b','#d9d0be','#c2305a','#f6d8de','#5d6b52','#a67c2e','#ddd4c2','#ffffff'),
    stage=('#14171a','#2a2f33'), t3=('#15181b','#2c1c24'), t4=('#15110f','#50202f'), sess=('#2b3338','#14171a','#0c0e10'),
    g=('#0c0e10','#14181b','#1d2327','#2b3338','#424d54','#5f7a72','#4d665f'), cloud='#d9dfe2', spruce='#14171a',
    sun='#f2849c', btn_d=('#f28ca4','#d46684'), btn_l=('#d03c68','#a8264f'), onst='#1a0b10',
    lamp=('#f0809a','#ffd9e2','#b03a5a','#4a1830','#ff90aa','#ffb3c4'), off=('#1d2226','#7b8a90','#5c6a70','#4f5b61'), cord='#8a979c',
    ink_st=('#f3f1ec','#cdd2d4','#a3adb1'), goldst='#e0b866', trackst='#3a4146'),
  # ——— własny akcent ———
  dict(id='bursztyn', name='Bursztyn', note='Miód i herbata', group='own',
    d=ui('#17110c','#211912','#2b2118','#f6efe4','#bba993','#3a2d20','#e9a94a','#3b2a15','#a3a874','#e8c98a','#3a2d20','#1b120a'),
    l=ui('#f6efe3','#fffaf1','#ece2d0','#2a1d12','#6d5a45','#e0d3bc','#a85f0c','#f7e3bf','#7a8048','#8f6a1f','#e0d3bc','#ffffff'),
    stage=('#1d140c','#3a2616'), t3=('#1f150d','#3a2314'), t4=('#1c110a','#5a2c14'), sess=('#3a2616','#1d140c','#130c07'),
    g=('#140d07','#1d130a','#2a1b0f','#3a2616','#5a3a22','#7d8a45','#66723a'), cloud='#f1dfc0', spruce='#2a1b0f',
    sun='#f2b95f', btn_d=('#f4c070','#d9964a'), btn_l=('#bf6f14','#96560b'), onst='#1b120a',
    lamp=('#f5b351','#ffe3a8','#c9782a','#6b3b14','#ffb55a','#ffd08a'), off=('#2a1d12','#8a6a44','#6b5236','#5c4630'), cord='#9a8365',
    ink_st=('#f6efe4','#dccdb4','#b9a78f'), goldst='#f0cf8a', trackst='#3d2f20'),
  dict(id='granat', name='Granat z koralem', note='Głęboki granat i koral', group='own',
    d=ui('#0a1220','#111c30','#18253d','#eef2f8','#9aabc4','#223350','#f5806f','#35222a','#6f93b8','#e6c88f','#243756','#0a1220'),
    l=ui('#eef2f8','#fafcff','#dfe6f1','#101a2e','#4a5a78','#cfd8e6','#c9432f','#fbdcd5','#4f7aa8','#9a7a3a','#cfd8e6','#ffffff'),
    stage=('#0b1730','#173057'), t3=('#101c33','#2e2036'), t4=('#160f26','#53203a'), sess=('#1b3a66','#0b1730','#070e1f'),
    g=('#081022','#0c1a33','#11264a','#1b3a66','#2c5688','#3f8fa0','#2f7686'), cloud='#c5d8f0', spruce='#0f1c36',
    sun='#ff8f7f', btn_d=('#ff9f8d','#e8694f'), btn_l=('#d9533e','#b83a27'), onst='#0a1220',
    lamp=('#ff8a73','#ffe0d8','#d9553f','#5a1f1a','#ff8f7f','#ffb3a6'), off=('#0f1f3a','#5f84b5','#46689a','#3f5f90'), cord='#6f88ad',
    ink_st=('#eef2f8','#c0cde2','#9aabc4'), goldst='#e6c88f', trackst='#243756'),
  dict(id='luxury', name='Luxury', note='Czerń i złoto', group='own',
    d=ui('#0b0b0c','#151516','#1e1e20','#f4efe6','#a8a193','#2e2b24','#d9b36c','#2d2615','#a89a6a','#f0d9a0','#2e2b24','#14110a'),
    l=ui('#f6f2ea','#fffdf8','#ebe5d8','#1a1814','#645d50','#ddd5c4','#8f6a1c','#f2e6c4','#8a7a45','#8a6a1c','#ddd5c4','#ffffff'),
    stage=('#0c0c0d','#1c1a16'), t3=('#0f0e0d','#241c0f'), t4=('#0c0b0a','#3a2a0e'), sess=('#26221a','#0f0e0c','#080808'),
    g=('#070707','#0e0e0f','#161514','#23201a','#3a3326','#8a7440','#6b5a34'), cloud='#e8d8ae', spruce='#15130e',
    sun='#e6c67e', btn_d=('#f2d899','#c9a04a'), btn_l=('#b8892b','#8f6718'), onst='#14110a',
    lamp=('#f1cf7a','#fff1c9','#b8862a','#4a3410','#f3cf80','#f6dc9a'), off=('#161512','#7d6d4a','#5a4e36','#4d4430'), cord='#8c7f60',
    ink_st=('#f4efe6','#cfc7b4','#a8a193'), goldst='#f0d9a0', trackst='#2f2b22'),
  dict(id='cynober', name='Tusz i cynober', note='Papier i czerwień', group='own',
    d=ui('#141211','#1d1a18','#26221f','#f3efe8','#a8a095','#342f2a','#e85a42','#3a1f1b','#7d8c6e','#e0b866','#342f2a','#1a0d09'),
    l=ui('#f1ece1','#faf7f0','#e6dfd0','#1c1a17','#5a554b','#d9d0be','#b8321f','#f6d9d0','#5d6b52','#a67c2e','#ddd4c2','#ffffff'),
    stage=('#14171a','#2a2f33'), t3=('#15181b','#2e1a18'), t4=('#15110f','#5a1d14'), sess=('#2b3338','#14171a','#0c0e10'),
    g=('#0c0e10','#14181b','#1d2327','#2b3338','#424d54','#5f7a72','#4d665f'), cloud='#d9dfe2', spruce='#14171a',
    sun='#e0533c', btn_d=('#ee6a52','#c93d27'), btn_l=('#d9482f','#b02e1a'), onst='#1a0d09',
    lamp=('#e8553d','#ffd5c8','#b03520','#4a1810','#f26a4c','#ff9a85'), off=('#1d2226','#7b8a90','#5c6a70','#4f5b61'), cord='#8a979c',
    ink_st=('#f3f1ec','#cdd2d4','#a3adb1'), goldst='#e0b866', trackst='#3a4146'),
]

def block(selector, f, m):
    c, dark = f[m], m == 'd'
    btn = f['btn_d'] if dark else f['btn_l']
    g, lp, off = f['g'], f['lamp'], f['off']
    shadow = '0 1px 2px rgba(0,0,0,.35), 0 10px 28px -14px rgba(0,0,0,.65)' if dark else '0 1px 2px rgba(30,20,10,.07), 0 8px 24px -12px rgba(30,20,10,.24)'
    return f'''{selector} {{
  --bg: {c['bg']}; --surface: {c['sf']}; --surface-2: {c['sf2']}; --ink: {c['ink']}; --ink-2: {c['ink2']}; --line: {c['line']};
  --pink: {c['pink']}; --pink-bright: {f['sun']}; --pink-soft: {c['soft']}; --moss: {c['moss']}; --spruce: {f['spruce']}; --on-pink: {c['onp']};
  --btn-top: {btn[0]}; --btn-bot: {btn[1]}; --gold: {c['gold']}; --track: {c['track']};
  --chip-bg: {'var(--pink)' if dark else 'var(--spruce)'}; --chip-ink: {c['onp'] if dark else '#f2f5f3'};
  --shadow: {shadow};
  --stage-top: {f['stage'][0]}; --stage-bot: {f['stage'][1]}; --t3a: {f['t3'][0]}; --t3b: {f['t3'][1]}; --t4a: {f['t4'][0]}; --t4b: {f['t4'][1]};
  --sess-a: {f['sess'][0]}; --sess-b: {f['sess'][1]}; --sess-c: {f['sess'][2]};
  --g0: {g[0]}; --g1: {g[1]}; --g2: {g[2]}; --g3: {g[3]}; --g4: {g[4]}; --g5: {g[5]}; --g5b: {g[6]}; --cloud: {f['cloud']};
  --st-ink: {f['ink_st'][0]}; --st-ink-2: {f['ink_st'][1]}; --st-ink-3: {f['ink_st'][2]}; --gold-st: {f['goldst']}; --track-st: {f['trackst']};
  --btn-st-top: {f['btn_d'][0]}; --btn-st-bot: {f['btn_d'][1]}; --on-st: {f['onst']};
  --lamp: {lp[0]}; --lamp-hi: {lp[1]}; --lamp-rib: {lp[2]}; --lamp-cap: {lp[3]}; --lamp-glow: {lp[4]}; --ember: {lp[1]}; --lamp-bead: {lp[5]};
  --lamp-off-fill: {off[0]}; --lamp-off-stroke: {off[1]}; --lamp-off-rib: {off[2]}; --lamp-off-cap: {off[3]}; --cord: {f['cord']};
  --meta: {c['bg']};
  color-scheme: {'dark' if dark else 'light'};
}}
'''

css = ['''/* GENEROWANE przez tools/gen-themes.py: nie edytuj ręcznie. Motywy: <html data-theme="rodzina-ciemny|jasny">.
   Zmienne „scena” (--stage-*, --g0…, --lamp*) dotyczą ciemnych powierzchni z krajobrazem: hero, kafel serii, sesje.
   Wartości domyślne (:root) to Las, jasny. */
''']
las = FAMILIES[0]
css.append(block(':root', las, 'l'))
for f in FAMILIES:
    for m, name in (('d', 'dark'), ('l', 'light')):
        css.append(block(f':root[data-theme="{f["id"]}-{name}"]', f, m))
(ROOT / 'css/themes.css').write_text('\n'.join(css))

fams = [dict(id=f['id'], name=f['name'], note=f['note'], group=f['group'],
             sw=dict(dark=[f['d']['bg'], f['d']['sf'], f['d']['pink'], f['d']['gold']],
                     light=[f['l']['bg'], f['l']['sf'], f['l']['pink'], f['l']['gold']]),
             meta=dict(dark=f['d']['bg'], light=f['l']['bg'])) for f in FAMILIES]
js = f'''// GENEROWANE przez tools/gen-themes.py: nie edytuj ręcznie.
// Rodziny kolorystyczne (każda ma tryb ciemny i jasny). Wartości zmiennych są w css/themes.css (<html data-theme="rodzina-tryb">).
// sw: kolejno tło, powierzchnia, akcent, złoto (kropki podglądu); meta: kolor paska przeglądarki (theme-color).
export const FAMILIES = {json.dumps(fams, ensure_ascii=False, indent=2)};

const IDS = new Set(FAMILIES.map((f) => f.id));

// Starsze wartości ustawienia `theme` (przed v0.14) → [rodzina, tryb].
const LEGACY = {{ las: ['las', 'dark'], poranek: ['las', 'light'], bursztyn: ['bursztyn', 'dark'], granat: ['granat', 'dark'],
  luxury: ['luxury', 'dark'], cynober: ['cynober', 'light'], dark: ['las', 'dark'], light: ['las', 'light'], auto: ['las', 'auto'] }};

// Zwraca {{ theme, mode }} z zapisanego stanu; jeśli `themeMode` nie istnieje, migruje stare ustawienie.
export function normalizeTheme(theme, mode) {{
  if (!mode && LEGACY[theme]) [theme, mode] = LEGACY[theme];
  if (!IDS.has(theme)) theme = 'las';
  if (!['auto', 'dark', 'light'].includes(mode)) mode = 'auto';
  return {{ theme, mode }};
}}

export const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
export const effectiveMode = (mode) => (mode === 'auto' ? (systemDark() ? 'dark' : 'light') : mode);
export const themeAttr = (theme, mode) => `${{theme}}-${{effectiveMode(mode)}}`;
export const themeMeta = (theme, mode) => (FAMILIES.find((f) => f.id === theme) || FAMILIES[0]).meta[effectiveMode(mode)];
'''
(ROOT / 'js/themes.js').write_text(js)
print('ok:', len(FAMILIES), 'rodzin')
