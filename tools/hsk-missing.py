#!/usr/bin/env python3
"""Wypisuje znaki danego poziomu HSK 2.0, których jeszcze nie ma w js/data.js.

Użycie:
  git clone --depth 1 https://github.com/drkameleon/complete-hsk-vocabulary /tmp/hsk
  git clone --depth 1 https://github.com/skishore/makemeahanzi /tmp/mmah
  python3 tools/hsk-missing.py /tmp/hsk /tmp/mmah 2

Wynik (TSV): znak, pinyin (pierwsze odczytanie z Make Me a Hanzi), angielska definicja, słowa HSK z tym znakiem.
Polskie znaczenia dopisujesz ręcznie. Znak dostaje poziom najniższego słowa, w którym występuje.
Pinyin z Make Me a Hanzi bywa nietypowy (np. 呢 → né zamiast ne), więc sprawdź kolumnę 2 z odczytaniem ze słów.
"""
import json, re, sys, pathlib

hsk, mmah, level = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), int(sys.argv[3])
root = pathlib.Path(__file__).resolve().parent.parent
have = set(re.findall(r"^\s*\['(.)',", (root / 'js/data.js').read_text(encoding='utf-8'), re.M))
mm = {}
for line in (mmah / 'dictionary.txt').read_text(encoding='utf-8').splitlines():
    j = json.loads(line)
    mm[j['character']] = j

lvl, words = {}, {}
for e in json.load(open(hsk / 'complete.json', encoding='utf-8')):
    ols = [int(x.split('-')[1]) for x in e['level'] if x.startswith('old-')]
    if not ols:
        continue
    for ch in e['simplified']:
        if '一' <= ch <= '鿿':
            lvl[ch] = min(lvl.get(ch, 9), min(ols))
            if min(ols) == level:
                words.setdefault(ch, []).append(e['simplified'])

for ch in sorted(c for c, l in lvl.items() if l == level and c not in have):
    m = mm.get(ch, {})
    print(ch, '/'.join(m.get('pinyin', [])), (m.get('definition') or '')[:60], ','.join(dict.fromkeys(words[ch]))[:40], sep='\t')
