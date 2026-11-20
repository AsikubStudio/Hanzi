# BotHanzi: architektura (v0.1)

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

## Następne kroki
1. Pełna baza HSK 1–6 (~2500 znaków) z weryfikacją poziomów i polskich znaczeń.
2. Kolejność pociągnięć / animacja znaków, audio.
3. Eksport/import postępu (JSON) i ewentualna synchronizacja.
4. Weryfikacja iOS: instalacja z Safari, ikony, pasek stanu.
