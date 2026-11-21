# Synchronizacja profili: konfiguracja Firebase (jednorazowo, ok. 10 minut)

Aplikacja działa na GitHub Pages (same pliki statyczne), więc do łączenia dwóch telefonów potrzebna jest zewnętrzna baza. Używamy darmowego planu Firebase (Firestore). Aplikacja rozmawia z bazą przez zwykłe zapytania HTTPS, bez SDK i bez kont: telefony łączy **kod parowania** (12 znaków).

Bez tej konfiguracji wszystko działa, tylko profile żyją na jednym urządzeniu.

## 1. Projekt i baza
1. Wejdź na https://console.firebase.google.com i zaloguj się kontem Google.
2. **Dodaj projekt** (np. „bothanzi”). Google Analytics możesz wyłączyć.
3. W menu **Build → Firestore Database → Utwórz bazę danych**. Lokalizacja: `eur3 (europe-west)`. Tryb: **produkcyjny**.

## 2. Reguły bezpieczeństwa
W Firestore otwórz zakładkę **Reguły**, wklej poniższe i kliknij **Opublikuj**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{room}/profiles/{profile} {
      allow get: if profile in ['asia', 'kuba'];
      allow create, update: if profile in ['asia', 'kuba']
        && request.resource.data.keys().hasOnly(['data', 'ts'])
        && request.resource.data.data is string
        && request.resource.data.data.size() < 400000
        && request.resource.data.ts is int;
      allow list, delete: if false;
    }
  }
}
```

Dostęp do danych ma ten, kto zna kod parowania (nie da się wylistować istniejących kodów). Traktuj kod jak hasło.

## 3. Klucze
1. **Ustawienia projektu (ikona koła zębatego) → Ogólne → Twoje aplikacje → ikona `</>` (Web)**. Zarejestruj aplikację (hosting Firebase niepotrzebny).
2. Z wyświetlonego `firebaseConfig` potrzebujesz tylko `apiKey` i `projectId`.
3. Wpisz je w pliku `js/config.js`:
   ```js
   export const FIREBASE = {
     projectId: 'twoj-projekt',
     apiKey: 'AIza…',
   };
   ```
4. Wgraj zmieniony plik na GitHub (service worker odświeży aplikację).

Klucz `apiKey` jest publiczny z założenia; chroni baza reguły. Dla porządku możesz go ograniczyć: Google Cloud Console → **API i usługi → Dane logowania** → klucz → ograniczenia aplikacji **Referery HTTP**: `https://asikubstudio.github.io/*`, ograniczenia API: **Cloud Firestore API**.

## 4. Połączenie telefonów
1. Telefon 1: wybierz profil → ikona profilu w nagłówku → **Synchronizacja → Utwórz kod na tym telefonie**.
2. Telefon 2: na ekranie wyboru profilu → **Połącz z drugim telefonem** → wpisz kod.
3. Od tej chwili profile (nazwa, zdjęcie, postęp, motyw) kopiują się między telefonami, a przy znakach widać awatary obu osób.

Synchronizacja działa po starcie, przy powrocie do aplikacji, ok. 3 sekundy po zmianie i co 90 s przy otwartej aplikacji. Bez internetu aplikacja działa normalnie i wyśle zmiany później.

## Limity
Darmowy plan (Spark) daje 50 tys. odczytów i 20 tys. zapisów dziennie, a aplikacja zużywa kilka procent tego.
