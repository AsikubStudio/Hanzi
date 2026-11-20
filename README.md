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
- `js/data.js` — baza znaków (zestaw startowy: 46 znaków; pełne HSK 1–6 w następnym kroku)
- `js/store.js` — stan w localStorage (znane, trudne, własne fiszki, SRS, seria)
- `js/srs.js` — Leitner (5 pudełek), generatory talii
- `js/search.js` — wyszukiwanie: pinyin bez tonów, polski, angielski, znak
- `js/quiz.js` — ocena quizu (pinyin, ton, znaczenie PL/EN)
- `js/strokes.js` — animacja kolejności kresek (SVG, bez zależności)
- `strokes/` — dane kresek per znak (+ `index.json`, licencja Arphic); `tools/build-strokes.mjs` generuje je z hanzi-writer-data
- `js/ui.js` — widoki (HTML), `js/app.js` — router, zdarzenia, sesja fiszek (swipe)
- `docs/ARCHITECTURE.md` — decyzje i plan dalszych kroków

## Dane kresek
Po dodaniu nowych znaków do `js/data.js` uruchom:

    git clone --depth 1 https://github.com/chanind/hanzi-writer-data /tmp/hwd
    node tools/build-strokes.mjs /tmp/hwd

Potem podbij `VERSION` w `sw.js`.
