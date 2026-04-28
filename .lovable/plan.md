# AI minőségi javítások: identitás-zár, névkonzisztencia, klisé-irtás

A felhasználói visszajelzés három kritikus AI-hibát azonosított: (1) karakter-identitás összemosás (Korfu — Luca ember vs. tengeri lény), (2) mellékkarakter-név elfelejtése a fejezetek közt (Tihany — Viktor → Márk), (3) testi-reakció klisék túlzott ismétlődése (torka kiszáradt, vér dübörgött, hideg futott végig).

## Mit építünk

### 1. Karakter-identitás zár (új)
A `characters` tábla már tárolja a `role`-t, `appearance_description`-t, `backstory`-t. Új prompt-blokk minden jelenetgenerálásban: minden főszereplőre egysoros „identitás-kártya" — KI ő (ember/sellő/varázsló/stb.), MI a titka, és MI NEM ő. Ezt a `buildCharacterIdentityLock()` helper építi, és a write-scene + process-next-scene + write-section system promptba kerül a name-lock közelébe, EXPLICIT tiltással: „TILOS Lucát mágikus lénynek ábrázolni, ha a profilja szerint ember."

### 2. Mellékkarakter-név perzisztencia
Jelenleg a `validateAndFixCharacterNames` csak a `characters` táblában regisztrált neveket védi. Probléma: a vőlegény (Viktor) gyakran nincs külön karakterként rögzítve, csak a story_idea-ban / előző fejezet szövegében szerepel. Két lépés:

- **a)** A `process-next-scene` és `write-scene` minden generálás után kinyeri a NEM-regisztrált, de 2+ fejezetben visszatérő neveket egy új `project.recurring_names` JSONB mezőbe (név → első előfordulás fejezete + 1 mondatos szerepkör-leírás).
- **b)** A következő jelenet promptja ezt a recurring-name listát is megkapja KÖTELEZŐ használatként: „Eszter vőlegényét Viktornak hívják (3. fejezetben bevezetve) — végig így nevezd."
- **c)** A `validateAndFixCharacterNames` is használja ezt a listát Levenshtein-fuzzy javításra (Márk → Viktor, ha hasonló pozícióban szerepel).

### 3. Megerősített klisé-kontroll
A `cliche-tracker.ts` már létezik (8 tracked klisé, per-book limit 3, per-chapter 1), de a felhasználó szerint a limit nem érvényesül elég szigorúan. Javítások:

- **Limit szigorítás**: per-book limit 3 → **2**, per-chapter 1 → **1** (változatlan).
- **Új klisék felvétele a tracker listára**: „halántéka lüktetett", „lába elgyengült", „ujjai elfehéredtek", „pulzusa felszökött", „nyelt egy nagyot" — összesen 13 tracked phrase.
- **Generálás közbeni hard-stop**: ha a generált jelenet egy már limit-elért klisét tartalmaz, a write-scene **automatikusan újrapróbálja** (eddigi retry mechanizmussal, max 1 extra próba) ahelyett, hogy csak az auto-lectorra bízná. A `quality-checker`-be új kritérium: `clicheOverflow`.
- **Rotációs pool a promptban**: a klisé-blocklist kibővül egy 25 elemű ALTERNATÍVA listával, amit a tiltások mellé teszünk: „Feszültség jelzésére használhatod: térde elgyengült / nyelvét a szájpadláshoz nyomta / füle zúgni kezdett / bordái között feszült érzés / ujjpercei elfehéredtek a szorítástól / …"
- **Auto-lector már létező klisé-csere instrukciója** változatlan, de a kibővített listához igazodik.

### 4. Karakter-tic monitor (kis kiegészítés)
A `chapters.character_appearances` JSONB-be új mező: `repeated_gestures` (string[]). Ha egy karakter ugyanazt a gesztust 3+ fejezetben elköveti („mellkasához szorította a naplót"), a következő scene promptja figyelmeztet: „Anna már 3× mellkasához szorította a naplót — variálj."

## Mit NEM csinálunk most (későbbi javaslat)
- Hosszkontroll-növelés (default 70k szó standalone romance-re) — külön kérésre.
- Sequel-hook flag (standalone vs. sorozat) — a series_id már létezik, ezt később kötjük be.

## Érintett fájlok

**Edge function shared modulok:**
- `supabase/functions/_shared/cliche-tracker.ts` — limit, új klisék, alternatíva pool
- `supabase/functions/_shared/prompt-builder.ts` — új `buildCharacterIdentityLock()`, recurring-names blokk
- `supabase/functions/_shared/name-consistency.ts` — recurring_names támogatás
- `supabase/functions/_shared/quality-checker.ts` — clicheOverflow kritérium

**Író motor:**
- `supabase/functions/write-scene/index.ts` — identitás-lock injektálás, recurring_names olvasás+írás, klisé hard-retry
- `supabase/functions/process-next-scene/index.ts` — ugyanaz
- `supabase/functions/write-section/index.ts` — identitás-lock + klisé-blocklist (csak prompt szinten)
- `supabase/functions/auto-lector/index.ts` — kibővített klisé-csere

**Adatbázis migráció:**
- `projects.recurring_names` JSONB DEFAULT `'{}'::jsonb`
- `chapters.character_appearances` séma kiegészítés (kompatibilis, csak új optional mező)

## Tesztelés
Telepítés után új generálás indítása (Korfu-szerű setup ember főhőssel + idegen mágikus mellékszereplővel) — ellenőrzés: a 2. fejezet promptja tartalmazza-e az identitás-lockot, és a generált szöveg nem keveri-e össze. Klisé-számláló logok ellenőrzése a `[write-scene]` és `[auto-lector]` outputban.
