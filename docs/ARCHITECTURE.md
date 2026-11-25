# BotHanzi: architektura (v0.27)

## Decyzje
- Stos: vanilla JS (ES modules) + CSS, bez buildu. Hosting statyczny z HTTPS, pełne PWA.
- Dane po stronie klienta; postęp w localStorage (`bothanzi:v2`, osobno dla profili Asia i Kuba). Bez kont; opcjonalna synchronizacja między telefonami przez Firestore i kod parowania (v0.16).
- Język interfejsu: polski. Znaczenia: polski + angielski. Znaki i słowa (słowa tylko HSK 1–3).
- Standard: sylabus HSK 3.0 (od v0.23; wcześniej HSK 2.0), poziomy 1–6; poziom 7 oznacza „6+” (HSK 7–9).

## Model danych
Znak: `{ hanzi, pinyin (z tonami), hsk (1–7), en, pl }`; znaczenia rozdzielone średnikiem.
Stan jednego profilu (`state`): `known{hanzi:ts}`, `hard[hanzi]`, `vhard[hanzi]` (podzbiór hard), `missRun{hanzi:n}`, `custom[{id,hanzi,pinyin,en,pl,note}]`, `srs{key:{box,due}}`, `activity{date:n}`, `log{date:{r,g,ok,t}}`, `theme`, `themeMode`, `showTr`, `learnPref{size:'5'|'10'|'15'|'custom',custom}`.

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
- Seria dni: pięć stopni tła (0, 1–2, 3–6, 7–13, 14+ dni); od v0.7 wizualizują ją lampiony zamiast płomieni.

## Zmiany w v0.4
- Tło w stylu chińskim: hero z górami krasowymi, pagodą, bambusem, chmurami w stylu tradycyjnym i księżycową bramą; liczba drzew nadal rośnie z liczbą znanych znaków. Kafelek serii ma subtelny wzór meander (`--meander`, data-URI) pod płomieniami.
- Zdania przykładowe (`js/sentences.js`, 72 zdania): pokazują się w karcie znaku i na odwrocie fiszki (poza własnymi fiszkami). `bestSentence(hanzi)` wybiera zdanie z najmniejszą liczbą nieznanych znaków z bazy, potem z największą liczbą znanych, potem najkrótsze. Znaki spoza bazy są neutralne; nieznane znaki z bazy są przygaszone (kropkowane podkreślenie), szukany znak na różowo. Zdanie zmienia się po oznaczeniu kolejnych znaków jako znane.
- Tłumaczenie zdań to opcja: ikona tłumacza w prawym górnym rogu pola zdania pokazuje/ukrywa polskie tłumaczenie (pinyin zostaje widoczny). Wybór jest globalny i zapamiętany (`state.showTr`, domyślnie wyłączone); przełączanie nie przerysowuje widoku, więc nie przewraca fiszki ani nie restartuje animacji kresek.
- Zdanie jest współdzielone: indeks obejmuje każdy znak z bazy występujący w zdaniu, więc zdanie użyte dla 病 (np. 他病了，要吃药。) jest też kandydatem dla 他 i 药; wygrywa to z najmniejszą liczbą nieznanych znaków.
- Przy rozbudowie bazy do ~2500 znaków trzeba dopisać zdania (każdy znak powinien mieć co najmniej jedno).
- Service worker: `bothanzi-v5`.

## Zmiany w v0.5
- Baza: kompletny HSK 1 według oficjalnej listy HSK 2.0 (150 słów rozbitych na 178 unikalnych znaków), razem 200 znaków. Znak dostaje najniższy poziom słowa, w którym występuje (źródło: drkameleon/complete-hsk-vocabulary). Kolejność w poziomie: od najczęstszych (znaki będące słowami jednoznakowymi wcześniej), więc „Ucz się nowych” zaczyna od 的, 了, 是, 在.
- Poprawione poziomy starych znaków: 山, 马 → 3; 花 → 3; 茶 → 1; 极 → 3; 林, 森, 麻 → 4.
- Wiele odczytań w jednym polu pinyin („jiào; jué”, „le; liǎo”, „zi; zǐ”): wyszukiwarka dopasowuje każde, quiz akceptuje każde odczytanie, a ton liczy się dla odczytania pasującego do wpisanego pinyin (przy błędnym pinyin dla pierwszego).
- Kreski dla wszystkich 200 znaków (`strokes/`), zdania: 142, każdy znak HSK 1 ma co najmniej jedno.
- `tools/hsk-missing.py`: lista brakujących znaków wybranego poziomu.
- Service worker: `bothanzi-v6`. Uwaga na rozmiar: precache kresek to dziś ok. 0,8 MB; przy ~2500 znaków wyniesie ok. 10 MB, więc warto wtedy przejść na cache przy pierwszym użyciu.

## Zmiany w v0.6
- Usunięte nazwy poziomów HSK (Ściółka, Podszycie…); lista poziomów pokazuje tylko „HSK n” i licznik.
- Kafel serii to karta: seria z płomieniami, kalendarz nauki w stylu GitHuba (18 tygodni, poniedziałek–niedziela, 5 poziomów intensywności wg liczby powtórek, dotknięcie dnia pokazuje „liczba kart, czas”) i sekcja „Ogółem” (czas nauki, dni nauki, retencja, powtórki).
- Dane: `state.log[data] = { r, g, ok, t }`: r = oceniane karty, g/ok = karty liczone do retencji (powtórki i quiz; tryb „Ucz się nowych” nie liczy się do retencji), t = aktywny czas w ms. `activity` zostaje (seria) i zasila starsze dni bez `log`.
- Czas nauki: zegar w sesjach i quizach liczy czas od pokazania karty do odpowiedzi, pojedynczy odcinek najwyżej 45 s (żeby przerwa nie zawyżała czasu); pauza, gdy karta przeglądarki jest ukryta.
- Retencja = poprawne / ocenione w powtórkach i quizach (quiz: pełna poprawność).
- Hero: słońce i księżycowa brama narysowane za górami (karst jest teraz nieprzezroczysty), dzięki czemu słońce wschodzi zza góry.
- Service worker: `bothanzi-v7`.

## Zmiany w v0.7
- Płomienie serii zastąpione girlandą lampionów (nic już nie „lewituje”: lampiony wiszą na sznurze). Pierwszy sznur to dni 1–7, od 8. dnia pojawia się drugi (dni 8–14); zapalone lampiony mają różowy korpus, jasne wnętrze i poświatę, niezapalone to ciemny obrys, czyli cel na kolejne dni. Od 14 dni dochodzą migoczące iskry, a tło kafla nadal ciemnieje ku śliwce (tiery 0–4). Lampiony lekko się kołyszą, poświata pulsuje; `prefers-reduced-motion` wyłącza animacje.
- Gradient poświaty jest wewnątrz SVG girlandy (`lampGlow`); gradienty płomieni w `index.html` są już nieużywane.
- Service worker: `bothanzi-v8`.

## Zmiany w v0.8 (miasto usunięte w v0.11)
- Miasto lampionów (`js/city.js`): od 15. dnia serii w tle kafla rośnie nocna ulica w jednopunktowej perspektywie, jeden nowy element dziennie, do pełnej sceny w 365. dniu (351 kroków). Rzut perspektywiczny jest liczony ze współrzędnych 3D (kamera na wysokości 1,5 nad jezdnią, punkt zbiegu na horyzoncie, ulica o półszerokości 8), więc elewacje, okna, neony, lampy i jezdnia zbiegają się poprawnie.
- Kolejność budowy: droga i niebo (dzień 15), 24 lampy uliczne od widza ku horyzontowi, odległa panorama za końcem ulicy, 16 kwartałów od horyzontu ku widzowi (bryła z witrynami parteru, okna zapalane po jednym lub po kilka w dalekich kwartałach, dwa neony z hanzi HSK 1 prostopadłe do ulicy z odbiciem na mokrej jezdni), osiem sznurów lampionów zawieszonych w poprzek ulicy (lampion po lampionie), sześć samochodów, brama pailou, na końcu księżyc.
- Scena jest deterministyczna (stały generator pseudolosowy): dzień serii jednoznacznie określa obraz. Pod numerem serii widać procent ukończenia miasta.
- Układ: SVG 360×270 przy dolnej krawędzi kafla (maksymalnie 520 px szerokości, z zanikaniem u góry i po bokach); kafel dostaje dolny odstęp, żeby sekcja „Ogółem” nie nakładała się na scenę. Pełna scena to ok. 137 KB znaczników i 1,5 tys. węzłów (generowanie poniżej 50 ms).
- Animacje: migotanie neonów, pulsowanie lamp i lampionów; `prefers-reduced-motion` je wyłącza.
- Service worker: `bothanzi-v10` (w app shellu jest `js/city.js`).

## Zmiany w v0.10
- Kafel serii ma dwie części: „hero” (`.streak`: miasto w tle tekstu, girlanda, numer serii) oraz zwijaną sekcję „Kalendarz i statystyki” (`.streak-more`, domyślnie zwinięta; stan pamiętany do końca sesji w `ui.js`, akcja `toggle-stats`).
- Miasto (`.city`) jest teraz tłem hero i nie wchodzi pod kalendarz. Pod tekstem leży ciemny gradient, żeby neony nie gryzły liter.
- Girlanda zajmuje całą szerokość kafla: sznur to SVG bez proporcji (`preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`), a lampiony to osobne małe SVG o stałym rozmiarze, ustawione w procentach szerokości. Drugi rząd (dni 8–14) jest przesunięty między lampiony pierwszego.
- Zwijanie: `grid-template-rows 0fr→1fr`, ukryta część ma `inert` i `visibility: hidden`, więc nie łapie fokusa.

## Zmiany w v0.11
- Miasto lampionów (`js/city.js`) zostało usunięte, podobnie jak lampiony w głębi (próbowane w wersjach roboczych). Zostają dwa sznury lampionów na całą szerokość kafla: dni 1–7 i dni 8–14, w lekkiej perspektywie (drugi sznur jest dalej: odrobinę węższy, niżej, z mniejszymi lampionami). Szczegóły: `rowGeom` w `ui.js`. Od 14 dni dochodzą migoczące iskry.
- Kafel serii to hero (numer serii + girlanda) oraz zwijana sekcja „Kalendarz i statystyki” (domyślnie zwinięta, stan pamiętany do końca sesji). Belka rozwijania i sekcja „Ogółem” nie mają już linii ani ciemniejszego tła, więc gradient kafla przechodzi płynnie w sekcję statystyk.
- Service worker: `bothanzi-v12`.

## Zmiany w v0.12 (paleta)
- Ciemny motyw: tło `#0c1713`, powierzchnie `#142620` z ramką `#233d34` (rozwarstwienie: tło < karty), tekst `#f2f5f3`, tekst pomocniczy `#9cb3aa`. Różowy akcent jest bardziej koralowy: `#f0829a` (`--pink`, `--pink-bright`).
- Główny przycisk (`.btn.primary`) ma pionowy gradient (`--btn-top`/`--btn-bot`: ciemny `#f28ba0`→`#d96b82`, jasny `#dc3f70`→`#b9264f`) i wewnętrzne rozświetlenie u góry; tekst na nim to `--on-pink` (ciemna zieleń `#0c1713` w ciemnym motywie). Przyciski na ciemnych ekranach (sesja, quiz, podsumowanie) używają `--btn-dark` i tekstu `#0c1713`.
- Mikro-akcent złota (`--gold`, `#d9b36c`): nazwa rangi w hero oraz pełny pasek poziomu HSK (`.bar.full`).
- Puste tory pasków postępu: `--track` (`#264238` w ciemnym motywie). Nieaktywne lampiony mają jaśniejszy obrys (`#6f9f8a`) i żebra, żeby były widoczne na zielonym i śliwkowym tle.
- `theme-color` w ciemnym motywie: `#0c1713`. Service worker: `bothanzi-v13`.

## Zmiany w v0.27 (automatyczne czytanie, niespodzianki)
- **Automatyczne czytanie** (`sayOnce` w app.js, bez komunikatów o braku głosu): przy pierwszym odkryciu fiszki (raz na kartę, `S.said`; ponowne obrócenie nie czyta), przy otwarciu karty znaku z siatki lub wyszukiwarki (`openChar(h, true)`; odświeżenie arkusza po zmianie znany/trudny nie czyta) i karty słowa, na ekranie wyniku quizu pisemnego oraz pisania (także „Nie pamiętam”). Quiz ze słuchu czytał już wcześniej.
- **Niespodzianki** (`maybeEgg`, tylko profil `asia`): przy odkryciu odpowiedzi (fiszki: pierwsze obrócenie; quizy: ekran wyniku w pisemnym, ze słuchu i pisaniu) losowanie raz na kartę: „STOPY” 3,5% na 0,36 s, „ALEK STANIO” 8% na 0,75 s. Napis na środku ekranu (element `.egg` w `body`, z-index 90, bez dotyku), lekko przyciemnione tło, iskry rozchodzące się od środka; styl liter losowany: opalizujący (`egg-myth`), karmazynowy żar (`egg-ember`), złoty blask (`egg-gold`). Przy `prefers-reduced-motion` napis jest statyczny, bez iskier.
- v0.27.1: STOPY wyświetlane 0,36 s. SW `bothanzi-v36` (v0.27: v35).

## Zmiany w v0.26 (bardzo trudne)
- **Bardzo trudne** (`state.vhard`, podzbiór `state.hard`): oznaczane przyciskiem „Bardzo trudny” w karcie znaku (`toggle-vhard`, `setVHard`; dodanie oznacza też jako trudny) albo automatycznie po 3 błędach z rzędu (`VHARD_RUN`, licznik `state.missRun`, liczony w `grade()` we wszystkich ćwiczeniach z oceną; dobra odpowiedź zeruje licznik, komunikat „X jest teraz bardzo trudny”). Usunięcie z trudnych zdejmuje też „bardzo trudny”. Synchronizacja: suma, ograniczona do trudnych.
- Bez osobnego treningu: bardzo trudne są w siatce Trudnych (na początku) i zawsze wchodzą do „Ćwicz trudne” (we wszystkich trybach).
- Wygląd (`glowOf` w ui.js): karmazynowy żar (pulsująca, nieregularna aura, czerwona ramka, unoszące się iskry `.ember-up`), bez białych błysków; na kafelku i fiszce. Znak mityczny zachowuje swoją poświatę, a „bardzo trudny” pokazuje karmazynowy znaczek w rogu (`.vh-badge`).
- Usunięte opisy pod chipami w „Odpytaj się” i „Ćwicz trudne”, podpowiedź w oknie „Dodaj do trudnych” oraz opis „Własne fiszki”. Awatary na fiszce przeniesione do lewego górnego rogu (nie nachodzą na znak po rozwinięciu słów).
- v0.26.1: w panelu „Ćwicz trudne” drugi przycisk „Ćwicz b. trudne (N)” (akcja `study-vhard`, talia `vhardDeck()`), działa we wszystkich trzech trybach; oba przyciski w tym samym stylu (btn primary), w dwóch równych kolumnach, napisy niezależne od trybu (tryb widać na chipie).
- v0.26.3: w panelu „Ćwicz trudne” wybór liczby kart Wszystkie / 10 / 30 / 50 / Własna (`ui.hardSize`, `ui.hardCustom`, pole `#hard-n`, `hardCap`, `hardLabel`); dotyczy obu przycisków i wszystkich trybów. Przy przycięciu talii bardzo trudne mają pierwszeństwo (`capHard` w app.js), potem tasowanie. Domyślnie „Wszystkie”.
- SW `bothanzi-v34` (v0.26: v31).

## Zmiany w v0.25 (trudne ze słuchu i pisania, słowa na fiszce, okienka nad klawiaturą, znaki mityczne)
- **Ćwicz trudne**: przełącznik Fiszki / Ze słuchu / Pisanie (`ui.hardMode`, akcja `hard-mode`). Słuch i pisanie używają `hardCharDeck()` (srs.js): trudne znaki z bazy plus własne fiszki, których znak jest w bazie; własne fiszki spoza bazy są pomijane (brak głosu, dystraktorów i kresek). Quiz startuje przez `startQuiz(deck, mode, emptyMsg)`; w podsumowaniu „Dodaj błędne do trudnych” pojawia się tylko, gdy któryś błędny znak nie jest jeszcze trudny.
- **Słowa na fiszce**: `cardWordsHTML(hanzi)` w `sessionView`, `<details class="card-words">` domyślnie zwinięte, max 6 słów. Dotknięcie listy nie przewraca ani nie przeciąga karty (`bindCard` pomija `.card-words`). Po rozwinięciu znak maleje, a zdanie przykładowe się chowa (`:has`).
- **Okienka nad klawiaturą**: arkusz z polem tekstowym (oraz `.sheet-learn`) dostaje klasę `is-dialog` (`markDialog`, MutationObserver na `#sheet`) i jest wyśrodkowany. Warstwa `#sheet` dopasowuje `top`/`height` do `visualViewport` (`fitViewport`), więc środek liczy się bez klawiatury; pole w fokusie jest przewijane do widoku. Okienek-dialogów nie zamyka się przesunięciem w dół (Esc, tło albo przycisk).
- **Znaki mityczne**: `MYTHIC = {足, 脚, 鹿}` (ui.js). Kafelek i fiszka dostają klasę `mythic`: obracająca się opalizująca obwódka (`@property --ang`, conic-gradient), opalizujący znak (gradient w tekście), pulsująca złota aura i iskry (`.spark`). W motywach jasnych barwy są przyciemnione (`:root[data-theme$="-light"]`). `prefers-reduced-motion` wyłącza animacje i iskry.
- SW `bothanzi-v30`.

## Zmiany w v0.24 (słowa, quiz ze słuchu, pisanie znaku)
- **Słowa** (`js/words.js`): 634 słowa wieloznakowe z list HSK 3.0 poziomów 1–3 (157 / 116 / 361), rekord `[słowo, pinyin bez spacji, poziom, EN, PL]`; znaczenia pisane ręcznie (źródłowy słownik ma błędy, np. 告诉, 东西), do przeglądu w `znaczenia-do-przegladu-slowa.csv`. `searchWords(q)` szuka po znakach, pinyin bez tonów (całe słowo: „kafei”, „mianbao”) i znaczeniach PL/EN; `wordsWith(znak)` daje słowa zawierające znak. UI: wyniki wyszukiwania mają sekcję „Słowa (N)” pod znakami, karta znaku ma „Słowa z tym znakiem” (do 8), a dotknięcie słowa otwiera kartę słowa (`wordSheetView`: duże słowo, pinyin, głośnik, znaczenia, kafelki znaków). Słowa nie mają własnego stanu (ani znane, ani SRS), więc nic nie dochodzi do synchronizacji.
- **Odpytaj się ma trzy tryby** (`ui.quizMode`: Pisemny / Ze słuchu / Pisanie): chipy na górze panelu w „Znanych”. Wynik każdego trybu zasila SRS tak jak dotąd (`grade`, `logReview`). Wspólne: pula to znane znaki, liczba 10/30/50/własna, „Powtórz błędne”, „Dodaj błędne do trudnych”; podsumowanie bez punktów dla trybów innych niż pisemny.
- **Quiz ze słuchu** (`js/listen.js`, `listenView`): aplikacja czyta znak (Web Speech, jak wymowa), a Ty wybierasz jedną z czterech odpowiedzi: pinyin z tonem, znak albo znaczenie PL (chipy: Mieszane / Pinyin / Znak / Znaczenie). Złe odpowiedzi budowane z bazy: „mylące” (to samo pinyin bez tonu, inny ton), potem z tego samego poziomu, potem dowolne; nigdy znak o tym samym brzmieniu co poprawny (żeby nie było dwóch dobrych) ani synonim. Znaki wieloodczytaniowe nie dostają pytania o pinyin, bo głos może czytać każde odczytanie. Przyciski: odtwórz ponownie i „wolniej” (tempo 0,5). Pytanie jest czytane od razu po pokazaniu (ten sam gest dotknięcia).
- **Napisz znak** (`js/write.js`, `writeView`): pokazuje pinyin i znaczenie, Ty rysujesz znak palcem na płótnie (pointer events, `touch-action: none`, przyciski „Cofnij kreskę” i „Wyczyść”). Ocena liczy tylko ogólny kształt, nie kolejność ani liczbę kresek: rysunek jest przesuwany i skalowany do ramki wzoru, potem porównywany z liniami środkowymi kresek wzoru (`strokes/*.json`, pole `m`) metodą „miękkiej” odległości w obie strony (pokrycie i precyzja, średnia harmoniczna; zasięg ok. 9% wymiaru). Próg `PASS` = 0,65 tylko podpowiada werdykt: po sprawdzeniu widać wzór (zielony) i rysunek (różowy), a Ty zatwierdzasz „Zaliczone” albo „Do powtórki” (można zmienić werdykt automatu). „Nie pamiętam” pokazuje wzór i liczy jako błąd. Kalibracja na próbnych rysunkach: poprawne 0,73–0,96, błędne znaki do 0,70.
- Ograniczenie oceny: bardzo podobne znaki (日/目) mogą dostać wysoki wynik, stąd korekta użytkownika.
- Service worker: `bothanzi-v29` (w app shellu `js/words.js`, `js/listen.js`, `js/write.js`).

## Zmiany w v0.23 (przejście na sylabus HSK 3.0)
- **Standard poziomów**: od v0.23 poziomy znaków wynikają z sylabusu HSK 3.0 (CLEC, listopad 2025; pierwsze egzaminy 13.12.2026), a nie z HSK 2.0. Źródło: `complete.json` z drkameleon/complete-hsk-vocabulary, tagi `newest-1…7` (to lista słów sylabusu z 2025; tagi `new-*` to starsza wersja z 2021). Znak dostaje najniższy poziom słowa, w którym występuje. Narastające sumy znaków z tych list: 248 (HSK 1), 371 (HSK 2), 653 (HSK 3), czyli prawie dokładnie oficjalne 246 / 371 / 655. Od HSK 4 wyliczone sumy są większe od oficjalnych (np. 1092 zamiast 1000), bo oficjalna lista znaków ma własny podział, którego nie ma w liście słów; dlatego poziomy 4–6 zaimportujemy dopiero po znalezieniu oficjalnej listy znaków (rozpoznawanych).
- **Baza**: 660 znaków (HSK 1: 248, HSK 2: 123, HSK 3: 282, HSK 4: 5, HSK 5: 1, HSK 6+: 1). HSK 1–3 są kompletne. Dodano 299 znaków (10 / 30 / 259), 87 znaków z bazy zmieniło poziom (np. 新, 要, 也, 到 z HSK 2 na 1; 北 na 3, 京 na 4). Postęp jest zapisany po znaku, więc nic się nie gubi. Kolejność w poziomie: najpierw znaki będące słowami jednoznakowymi, potem wg częstości słowa.
- Zdania przykładowe: 478 (+227), kontrola `node tools/check-data.mjs` przechodzi. Kreski: 660 plików, `strokes/index.json` w kolejności bazy.
- Service worker: `bothanzi-v28`, `STROKES_PRECACHE = 700` (wszystkie kreski wgrywane z góry, ok. 2,7 MB). Przy HSK 4+ trzeba będzie wrócić do wgrywania przy pierwszym użyciu.
- Wydania dzielimy na paczki po maks. 100 plików (limit wgrywania przez przeglądarkę na GitHubie; praktycznie ok. 55 na paczkę).
- Polskie znaczenia nowych znaków (HSK 2 z v0.22 i HSK 1–3 z v0.23) są robocze: `znaczenia-do-przegladu-hsk3.csv`.

## Zmiany w v0.22 (HSK 2)
- Baza: kompletny HSK 2 według oficjalnej listy HSK 2.0: 161 nowych znaków (poziom ma 168 razem z siedmioma wcześniejszymi), razem 361 znaków (HSK 1: 178, HSK 2: 168, 3: 9, 4: 4, 5: 1, 6+: 1). Lista wygenerowana `tools/hsk-missing.py` (źródło: drkameleon/complete-hsk-vocabulary), kolejność w poziomie wg najmniejszej częstości słowa HSK 2 z tym znakiem („Ucz się nowych” zaczyna od 就, 要, 也, 到, 还).
- Pinyin w polu może mieć kilka odczytań (`hái; huán`); w kafelku zostawiono najwyżej dwa lub trzy, żeby wiersze siatki nie rosły (着: `zhe; zháo`). Dla znaków występujących tylko w słowach (咖, 啡, 睛, 丈, 斤…) znaczenie ma dopisek „w 咖啡” itp.
- Kreski dla wszystkich nowych znaków skopiowane z hanzi-writer-data do `strokes/` (format `{s, m}`), `strokes/index.json` ma 361 wpisów, więc service worker wgrywa wszystko z góry (limit `STROKES_PRECACHE` = 600, ok. 1,5 MB).
- Zdania przykładowe: +109 (łącznie 251); każdy nowy znak ma co najmniej jedno. `node tools/check-data.mjs` przechodzi.
- Polskie znaczenia HSK 2 są robocze i czekają na przegląd (`znaczenia-hsk2-do-przegladu.csv`).
- Service worker: `bothanzi-v27`.

## Zmiany w v0.21
- **Własna fiszka przez wyszukiwanie**: okno „Dodaj do trudnych” (`formView`) ma pole wyszukiwania w całej bazie (hanzi, pinyin bez tonów, znaczenie PL/EN; `cardResultsHTML`, akcja `cf-toggle`, pole `#cf-q`). Dotknięcie wyniku dodaje znak do trudnych (albo go stamtąd usuwa), okno zostaje otwarte, więc można dodać kilka znaków. Dla słów spoza bazy zostaje rozwijane „Nie ma w bazie? Wpisz ręcznie” (dawny formularz z pinyin, znaczeniami i notatką → `state.custom`).
- **Wymowa**: przycisk głośnika jest mniejszy (30 px, ikona 16 px) i pojawia się też przy zdaniach przykładowych (lewy górny róg pola zdania, czyta całe zdanie tempem 0,8) w karcie znaku i na odwrocie fiszki.
- **Usunięto „Zapamiętaj profil”** (checkbox, `getRemember/setRemember`, klucz `bothanzi:remember`, `PICKER_KEY`). Świeże uruchomienie zawsze pokazuje wybór profilu; odświeżenie w trakcie sesji zostaje na profilu (`sessionStorage`). Stary klucz jest czyszczony przy starcie.
- **Pasek porównania** (`weekCardHTML`, Start, pod przyciskami): dwa rzędy (Ty i druga osoba): awatar, nazwa, „dziś: N kart / dziś: brak”, siedem lampionów (zapalony = dzień z nauką, litera dnia tygodnia) i seria. Bez nagłówka. Zawsze widoczny, gdy istnieją dwa profile (druga osoba bez postępu ma zgaszone lampiony). Wypróbowane i usunięte: osobna karta drugiej osoby (ranga, pasek, seria) pod przyciskami oraz jej wstęga w dolnym pasie hero. `lampSVG` zostaje wspólny z ekranem wyboru profilu. Kolejność Startu: hero, przyciski, pasek porównania, statystyki, seria, poziomy HSK.
- Service worker: `bothanzi-v26` (v0.21.1: v24; v0.21.2: v25; v0.21.3: v26, tylko pasek porównania bez nagłówka).

## Zmiany w v0.20
- Zakładka „Fiszki” zastąpiona zakładką „Trudne” (`#/hard`; stary adres `#/cards` jest aliasem). Widok `hardView` działa jak „Znane”: nagłówek z licznikiem i lupką (`hard-search`, pole `#hq` filtruje tylko trudne), chipy poziomów HSK (tylko te, w których są trudne znaki), siatka `#hard-grid`. Panel „Ćwicz trudne (N)” (`study-hard`) ćwiczy trudne znaki oraz własne fiszki. Poniżej sekcja „Własne fiszki” (lista, usuwanie `del-custom`, przycisk `new-card`).
- Usunięto „Powtórkę ze znanych” (`study-known`, `deck-level`, `deck-size`); w Znanych zostaje „Odpytaj się”. „Powtórka na dziś” zostaje na Starcie.
- Listy poziomów HSK na Starcie: znak oznaczony jako trudny jest czerwony (`.tile.is-hard`, kolor `--hard`) i ma pierwszeństwo przed różowym „znanym”.
- „Ucz się nowych znaków” otwiera arkusz (`learnSheetView`, akcje `learn-open`, `learn-size`, `learn-go`, pole `#learn-n`) z wyborem 5 / 10 / 15 / własna liczba (1 do liczby pozostałych znaków poziomu). Ostatni wybór jest zapamiętany w profilu (`state.learnPref`) i synchronizowany razem z resztą stanu. Przycisk w poziomie HSK pokazuje liczbę pozostałych znaków.
- Service worker: `bothanzi-v22`.

## Zmiany w v0.19 (wymowa, tydzień we dwoje, zapamiętany profil)
- **Wymowa** (`js/speak.js`): przycisk głośnika obok pinyin w karcie znaku, na odwrocie fiszki i na ekranie wyniku quizu (w pytaniu quizu go nie ma, bo zdradzałby odpowiedź). Web Speech API (`speechSynthesis`, głos `zh-CN`, tempo 0,8), bez plików audio. Gdy lista głosów jest załadowana i nie ma żadnego chińskiego, pokazuje się komunikat zamiast czytania błędnym głosem; bez obsługi API przycisk w ogóle się nie rysuje. Czyta się znak, nie pinyin, więc znaki wieloodczytaniowe (了, 行) czytane są domyślnym odczytaniem głosu. Niewidoczny przycisk na zakrytej fiszce nie łapie dotknięcia (`pointer-events: none` do odkrycia karty).
- **Ostatnie 7 dni** (`weekCardHTML` w `ui.js`, na stronie głównej między statystykami a kafelkiem serii): dwa rzędy (Ty i druga osoba): awatar, nazwa, „dziś: N kart”, siedem lampionów (zapalony = dzień z nauką, litera dnia tygodnia, dziś pogrubione) i seria. Ukryta, dopóki druga osoba nie ma żadnych znanych znaków ani aktywności. Dane drugiej osoby z lokalnej kopii (synchronizacja).
- (Usunięte w v0.21.) **Zapamiętanie profilu** (ustawienie tego urządzenia, domyślnie wyłączone): pole w oknie profilu. Gdy włączone, świeże uruchomienie wchodzi od razu na ostatni profil (`localStorage` `bothanzi:remember` i `bothanzi:last`); „Zmień profil” świadomie pokazuje ekran wyboru nawet po odświeżeniu (`sessionStorage` `bothanzi:picker`).
- **Kontrola danych**: `node tools/check-data.mjs` sprawdza unikalność znaków, poziomy HSK, pinyin i znaczenia, plik kresek, wpis w `strokes/index.json` i co najmniej jedno zdanie na znak; kod wyjścia 1 przy błędach. Uruchamiaj przed każdym wydaniem i po imporcie nowego poziomu.
- **Kreski**: service worker wgrywa z góry tylko pierwsze 600 z `strokes/index.json` (stała `STROKES_PRECACHE`), resztę zapamiętuje przy pierwszym otwarciu znaku; nieotwarty znak bez internetu pokazuje samo pismo drukowane.
- Service worker: `bothanzi-v21` (w app shellu `js/speak.js`).

## Zmiany w v0.17–v0.18 (gesty, obwódki, serie)
- **Zamykanie arkuszy gestem** (karta znaku, motywy, profil, synchronizacja, nowa fiszka): przesunięcie palcem w dół. Tylko układ mobilny (<900 px); z treści działa, gdy arkusz jest przewinięty do góry (więc przewijanie długiej zawartości go nie zamyka), a z uchwytu (górne 48 px) zawsze. Próg 110 px albo szybki ruch (>0,6 px/ms); krótszy ruch wraca na miejsce. Obsługa w `app.js` (zdarzenia touch, `touchmove` nieprzezroczysty dla przewijania dopiero po przekroczeniu progu), `overscroll-behavior: contain` na `.sheet`.
- Ekran wyboru profilu nie ma widocznego nagłówka (został `h1.sr-only` „Wybierz profil”).
- **Obwódki awatarów** przy znaku: zielona (`--known`), gdy znak jest w „Znanych”, czerwona (`--hard`), gdy w „Trudnych”; trudny ma pierwszeństwo.
- **Seria na ekranie wyboru**: pod nazwą profilu mały lampion w ciemnej pigułce (zapalony z poświatą, gdy dziś była nauka; zapalony bez poświaty, gdy seria trwa, a dziś jeszcze nie było nauki; zgaszony: „bez serii”). `streakOf(id)` i `activeTodayOf(id)` w `store.js`.
- Service worker: `bothanzi-v20` (v0.17: v19; v0.16.1: v18; v0.16: v17).

## Zmiany w v0.16 (profile Asia i Kuba, synchronizacja)
- **Profile**: dwa stałe profile (`asia`, `kuba`), każdy z własnym stanem (znane, trudne, własne fiszki, SRS, seria, kalendarz, statystyki, motyw i tryb, `showTr`) oraz nazwą i zdjęciem. `localStorage['bothanzi:v2'] = { v:2, profiles:{ id:{ name, avatar, state, ts, base } }, sync:{ code }, legacy }`. `state` w `store.js` to roboczy obiekt aktywnego profilu (podmieniany w miejscu przy zmianie profilu), więc reszta kodu go nie zna inaczej niż wcześniej. `bothanzi:ui` = `{theme, themeMode}` aktywnego profilu dla skryptu w `<head>`.
- **Start**: ekran wyboru profilu przy każdym uruchomieniu (dwa duże kółka, pod nimi liczba znanych znaków i „Edytuj”). Aktywny profil żyje w `sessionStorage`, więc odświeżenie strony w trakcie sesji nie wraca do wyboru. Zmiana profilu: ikona awatara w nagłówku → „Zmień profil”. Na ekranie wyboru obowiązuje motyw ostatnio używanego profilu.
- **Migracja**: postęp z `bothanzi:v1` (sprzed profili) czeka w `db.legacy` i trafia do pierwszego wybranego profilu (baner „Nie przenoś” go odrzuca; stary klucz v1 zostaje nietknięty jako kopia).
- **Zdjęcie**: wybór pliku → kadr do kwadratu (środek), 128×128, JPEG q0,82 jako data URL (ok. 2–9 KB), `js/avatar.js`. Nazwa do 16 znaków. Bez zdjęcia: inicjał na gradiencie (Asia: różowy, Kuba: złoty).
- **Awatary przy znaku**: `whoHas(hanzi)` zwraca profile, które mają znak w „Znanych” lub „Trudnych”; `whoHTML` rysuje małe awatary, a znak „trudny” dostaje czerwoną obwódkę. Widać je w arkuszu znaku (obok etykiety HSK) oraz na fiszce (góra karty, przód i tył). Dane drugiej osoby pochodzą z lokalnej kopii (ten sam telefon albo ostatnia synchronizacja).
- **Synchronizacja** (`js/sync.js`, `js/config.js`, instrukcja `docs/FIREBASE.md`): Firestore przez REST (bez SDK), dokument `rooms/<kod>/profiles/<id>` = `{ data: JSON {name, avatar, state}, ts }`. Kod parowania: 12 znaków z alfabetu bez 0/O/1/I, działa jak hasło (reguły nie pozwalają wylistować kodów). Każdy profil ma `ts` (ostatnia zmiana lokalna) i `base` (wersja, o której wiemy, że jest w chmurze). Reguła: chmura bez zmian → wyślij nasze; chmura zmieniona i brak zmian lokalnych → weź chmurę; zmiany po obu stronach → `mergeState` (znane, trudne i własne fiszki: suma; SRS: dalsze pudełko; aktywność i log: większa wartość dnia; pola pojedyncze, nazwa i zdjęcie: wersja nowsza) i wysłanie wyniku. Ponieważ każdy profil ma zwykle jednego właściciela, zwykle wystarcza prosta wymiana wersji; scalanie chroni przed utratą danych, gdy ten sam profil użyto na dwóch telefonach. Ograniczenie: usunięcie znaku ze „Znanych” w trakcie scalania może zostać cofnięte (suma zbiorów).
- **Kiedy synchronizuje**: po starcie, przy zmianie widoczności karty (wejście i wyjście), ok. 3,5 s po zmianie lokalnej, po powrocie internetu i co 90 s przy otwartej aplikacji. Błąd sieci nie przerywa pracy (status w arkuszu „Synchronizacja”). `localStorage['bothanzi:fbcfg']` pozwala nadpisać konfigurację (testy).
- Service worker: `bothanzi-v17` (w app shellu `js/sync.js`, `js/config.js`, `js/avatar.js`; zapytania do googleapis.com SW pomija).
- Testy: `/tmp/test/run16.py` (dwa „telefony” na atrapie Firestore: migracja, zdjęcie, kod parowania, awatary, scalanie), `run17.py` (offline, 360 px, brak konfiguracji).

## Zmiany w v0.15 (przełącznik trybu)
- Segmentowy wybór Auto/Ciemny/Jasny usunięty z arkusza motywów. W nagłówku, obok ikony palety, jest przycisk słońce/księżyc (`#mode-btn`, `data-act="mode"`): przełącza ciemny↔jasny względem trybu efektywnego (`effectiveMode`). Do pierwszego kliknięcia `themeMode` = auto (zgodnie z systemem); potem zapisany jawnie. Ikona i aria-label zależą od trybu (CSS po `data-theme$="-dark|-light"`, label w `applyTheme`). Arkusz jest modalny, więc przełącznik działa po jego zamknięciu.

## Zmiany w v0.13–v0.14 (motywy kolorystyczne)
- Model: rodzina kolorów × tryb. 9 rodzin, każda w trybie ciemnym i jasnym, wybór trybu Auto/Ciemny/Jasny (Auto podąża za systemem, także na żywo). Rodziny z różowym akcentem: Las, Herbata (brąz), Zmierzch (granat), Noc (czerń), Tusz (grafit). Rodziny z własnym akcentem: Bursztyn, Granat z koralem, Luxury (czerń i złoto), Tusz i cynober. Każda osoba wybiera swój motyw i nie zmienia go drugiej (na razie wybór jest per urządzenie; przy profilach trafi do danych profilu).
- Źródło prawdy: `tools/gen-themes.py` generuje `css/themes.css` i `js/themes.js` (nie edytować ręcznie; nowy motyw = nowy wpis w `FAMILIES` i uruchomienie skryptu). Motyw to atrybut `<html data-theme="rodzina-ciemny|jasny">`. Zmienne „scena” (`--stage-*`, `--g0…g5`, `--st-ink*`, `--lamp*`, `--btn-st-*`) dotyczą ciemnych powierzchni z krajobrazem (hero, kafel serii, sesje, quiz) i zależą tylko od rodziny; w trybie jasnym zmieniają się powierzchnie interfejsu, a scena zostaje ciemna.
- Lampiony, gradienty słońca i mgły oraz wzór meandra używają zmiennych (klasy `.lp-*`, `.s-pink`, maska zamiast data-URI z kolorem), więc zmieniają się razem z motywem bez ponownego renderowania.
- Stan: `state.theme` (id rodziny) i `state.themeMode` (`auto`/`dark`/`light`). Starsze zapisy (`dark`, `light`, `auto`, `poranek`, `las`, `bursztyn`, `granat`, `luxury`, `cynober`) migrują się w `normalizeTheme` (`js/themes.js`); mały skrypt w `<head>` ustawia motyw przed pierwszym malowaniem (bez błysku).
- UI: ikona palety w nagłówku otwiera arkusz „Motyw kolorystyczny” (przełącznik trybu + dwie grupy rodzin: „Różowy akcent” i „Własny akcent”); wybór działa od razu.
- Service worker: `bothanzi-v15` (w app shellu `css/themes.css`, `js/themes.js`).

## Dane kresek i licencja
Źródło: hanzi-writer-data (Make Me a Hanzi / Arphic Public License). Tekst licencji w `strokes/LICENSE-ARPHIC.txt`.

## Następne kroki
0. **Zrobione w v0.16: profile Asia i Kuba** (kod gotowy). Do włączenia synchronizacji trzeba założyć projekt Firebase wg `docs/FIREBASE.md` i wpisać klucze w `js/config.js`. Do rozważenia: powiadomienie „Asia powtórzyła dziś N kart”.
0b. **Zrobione w v0.14–v0.16: motywy kolorystyczne** (motyw i tryb są w danych profilu). Dziś są dwa tryby (jasny i ciemny) oparte na zmiennych CSS (`--bg`, `--surface`, `--pink`, `--gold` itd.), więc motywy to zestawy tych zmiennych wybierane atrybutem `data-theme`. Do ustalenia: ile motywów i jakie (np. obecny zielono-różowy, nocny granat, ciepły bursztyn), czy motyw jest per profil, czy per urządzenie, oraz czy zmieniają się też hero (góry, słońce) i kafel serii. Wybór zapisany w stanie (`theme`) i w `theme-color` meta.
1. Zrobione w v0.24: słowa HSK 1–3, quiz ze słuchu, pisanie znaku. Dalej: poziomy 4–6 wg sylabusu HSK 3.0 (po znalezieniu oficjalnej listy znaków rozpoznawanych; ok. 1700 znaków, więc w partiach po ~400); przegląd polskich znaczeń HSK 1–3. Zrobione w v0.23: HSK 1–3 wg HSK 3.0; v0.22: HSK 2. Zrobione w v0.19: kontrola danych, kreski przy pierwszym użyciu, wymowa, karta „Ostatnie 7 dni”. Zostaje: eksport/import postępu (JSON; projekt: plik z profilem, import scala lub zastępuje po podsumowaniu), przegląd polskich znaczeń HSK 1 (plik CSV do przeglądu).
2. Nagrane audio (zamiast syntezy mowy telefonu); słowa HSK 4+ razem z poziomami 4–6; ewentualnie słowa jako osobne fiszki (SRS).
3. Eksport/import postępu (JSON) i ewentualna synchronizacja.
4. Weryfikacja iOS: instalacja z Safari, ikony, pasek stanu.
