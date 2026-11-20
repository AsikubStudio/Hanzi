# BotHanzi

Mobilno-pierwsza PWA do nauki znaków hanzi. Vanilla JS (ES modules) + CSS, bez buildu i zależności.

## Uruchomienie lokalnie
Moduły ES i service worker wymagają serwera HTTP (nie działa z `file://`):

    python3 -m http.server 8000
    # otwórz http://localhost:8000

## Wdrożenie (PWA do „Dodaj do ekranu głównego”)
Wrzuć cały folder na dowolny hosting statyczny z HTTPS: GitHub Pages, Netlify, Cloudflare Pages.
Po zmianie plików podbij `VERSION` w `sw.js`, żeby użytkownicy dostali świeży cache.

## Struktura
- `index.html`, `manifest.webmanifest`, `sw.js`
- `css/styles.css` — motyw (jasny/ciemny), układ mobilny + szyna boczna na desktopie
- `js/data.js` — baza znaków: HSK 1 kompletny (178 znaków), w poziomach 2–6 na razie tylko 22 znaki startowe; poziomy wg oficjalnej listy HSK 2.0
- `js/store.js` — stan w localStorage (znane, trudne, własne fiszki, SRS, seria)
- `js/srs.js` — Leitner (5 pudełek), generatory talii
- `js/search.js` — wyszukiwanie: pinyin bez tonów, polski, angielski, znak
- `js/quiz.js` — ocena quizu (pinyin, ton, znaczenie PL/EN)
- `js/strokes.js` — animacja kolejności kresek (SVG, bez zależności)
- `strokes/` — dane kresek per znak (+ `index.json`, licencja Arphic); `tools/build-strokes.mjs` generuje je z hanzi-writer-data
- `js/sentences.js` — zdania przykładowe i wybór zdania pod znane znaki
- `js/ui.js` — widoki (HTML, w tym Start z poziomami i serią), `js/app.js` — router, zdarzenia, sesje (fiszki, quiz)
- `tools/hsk-missing.py` — wypisuje znaki wybranego poziomu HSK, których jeszcze nie ma w bazie (punkt wyjścia do dopisywania kolejnych poziomów)
- `docs/ARCHITECTURE.md` — decyzje i plan dalszych kroków

## Dane kresek
Po dodaniu nowych znaków do `js/data.js` uruchom:

    git clone --depth 1 https://github.com/chanind/hanzi-writer-data /tmp/hwd
    node tools/build-strokes.mjs /tmp/hwd

Potem podbij `VERSION` w `sw.js`.

## Dodawanie kolejnego poziomu HSK
1. `python3 tools/hsk-missing.py /tmp/hsk /tmp/mmah 2` (repozytoria w nagłówku skryptu) — lista brakujących znaków poziomu.
2. Dopisz rekordy do `js/data.js` (pinyin z tonami, EN, PL; kilka odczytań: „jiào; jué”).
3. Wygeneruj kreski (sekcja wyżej) i dopisz zdania w `js/sentences.js`, tak by każdy znak miał co najmniej jedno.
4. Podbij `VERSION` w `sw.js`.

## Źródła danych
- Poziomy HSK 2.0: drkameleon/complete-hsk-vocabulary (MIT).
- Kreski i kontrola pinyin: Make Me a Hanzi / hanzi-writer-data (Arphic Public License, patrz `strokes/LICENSE-ARPHIC.txt`).
- Znaczenia polskie i angielskie, zdania przykładowe: własne, do przejrzenia.
