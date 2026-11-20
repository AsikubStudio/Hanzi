# BotHanzi: architektura (v0.3)

## Decyzje
- Stos: vanilla JS (ES modules) + CSS, bez buildu. Hosting statyczny z HTTPS, pełne PWA.
- Dane po stronie klienta; postęp w localStorage (`bothanzi:v1`). Brak kont i synchronizacji w v0.1.
- Język interfejsu: polski. Znaczenia: polski + angielski.
- Standard HSK 2.0, poziomy 1–6; poziom 7 oznacza „6+”.

## Model danych
Znak: `{ hanzi, pinyin (z tonami), hsk (1–7), en, pl }`; znaczenia rozdzielone średnikiem.
Stan: `known{hanzi:ts}`, `hard[hanzi]`, `custom[{id,hanzi,pinyin,en,pl,note}]`, `srs{key:{box,due}}`, `activity{date:n}`, `theme`.

## Zachowanie
- Odblokowanie poziomu: poprzedni poziom opanowany w ≥ 50% (miękka blokada, podgląd zawsze możliwy).
- SRS Leitnera: odstępy 0/1/3/7/16/35 dni; „Znam” podnosi pudełko, „Jeszcze raz” wraca do 1.
- Wyszukiwanie: normalizacja NFD bez tonów i ogonków; „v” traktowane jak „ü”; frazy <3 znaki nie przeszukują znaczeń (poza dokładnym trafieniem).
- Rangi (wizualna progresja): Nasionko, Mech (10), Paproć (50), Młodnik (150), Ostoja (400), Puszcza (800), Król lasu (1500). Las w hero gęstnieje wraz z liczbą znanych znaków.

## Zmiany w v0.2
- Górny pasek z globalną wyszukiwarką (cała baza) na każdym ekranie; zakładka „Szukaj” usunięta. W Znanych dodatkowa lupka filtruje tylko znane znaki.
- Quiz w Znanych (10/30/50/własna liczba): kolejność pinyin bez tonu, ton (przyciski ā á ǎ à a), znaczenie PL lub EN. Cyfra na końcu pinyin ustawia ton. Znaczenie: trafienie jednego ze znaczeń, słowo z wyrażenia (≥3 litery) lub jedna literówka (≥5 liter). Wynik wpływa na SRS (pełna poprawność = „znam”).
- Fiszki: przycisk i swipe w górę „Dalej” (pominięcie bez oceny) w każdej sesji; tryb „Ucz się nowych” z Odkrywaj (Znam → znane, Trudny → trudne, Dalej).
- Karta znaku: animowana kolejność kresek. Własny renderer: obrys kreski jako clipPath, gruba linia po medianie rysowana przez stroke-dasharray. Dane w `strokes/<kod-hex>.json`, precache w service workerze.
- Start: usunięto „Utwórz talię ze znanych”.

## Zmiany w v0.3
- Start połączony z Odkrywaj (zakładki: Start, Znane, Fiszki). Poziomy HSK to listy rozwijane z wszystkimi znakami poziomu; znane na różowo; blokada wyższych poziomów usunięta; zawartość listy renderowana dopiero po otwarciu (wydajność przy ~2500 znaków).
- Karta znaku: dwa systemy pisma obok siebie w kwadratach tej samej wielkości (pismo drukowane i animowana kolejność kresek). Animacja zapętla się sama, bez przycisku „Powtórz”.
- Seria dni: płomienie w 5 stopniach (0, 1–2, 3–6, 7–13, 14+ dni): od szkicu, przez mini płomyczki, po duży ogień z iskrami i poświatą. `prefers-reduced-motion` wyłącza animacje.

## Dane kresek i licencja
Źródło: hanzi-writer-data (Make Me a Hanzi / Arphic Public License). Tekst licencji w `strokes/LICENSE-ARPHIC.txt`.

## Następne kroki
1. Pełna baza HSK 1–6 (~2500 znaków) z weryfikacją poziomów i polskich znaczeń.
2. Audio; tryb ćwiczenia rysowania znaku palcem.
3. Eksport/import postępu (JSON) i ewentualna synchronizacja.
4. Weryfikacja iOS: instalacja z Safari, ikony, pasek stanu.
