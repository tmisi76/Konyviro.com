

# Oknyomozó könyv típus hozzáadása

## Mi ez?

Egy új non-fiction könyv típus: **"Oknyomozó"** — dokumentumfilm-szerű könyv, ahol az oknyomozó szerző végigvezeti az olvasót egy valós ügyön, bizonyítékokkal, dokumentumokkal és kronologikus feltárással. Példák: "All the President's Men", "Catch Me If You Can", "A Habony-akták".

## Hogyan írnám az ilyen könyveket?

Az oknyomozó könyv **hibrid**: szakkönyv (tényalapú) + fikciós technikák (feszültség, jelenetezés, "show don't tell"). A struktúra:

```text
1. HOOK: Egy drámai jelenet a sztori közepéből
2. HÁTTÉR: A téma kontextusa, miért fontos
3. NYOMOZÁS: Kronologikus feltárás bizonyítékokkal
   - Dokumentumok, dátumok, nevek
   - Interjúk, vallomások
   - "Követsd a pénzt" típusú szálak
4. FORDULÓPONTOK: Áttörések, leleplezések
5. KÖVETKEZMÉNYEK: Mi lett a végeredmény
6. TANULSÁGOK: Miért fontos az olvasónak
```

## Érintett fájlok és változások

### 1. `src/types/wizard.ts` — Típus és konfiguráció
- `NonfictionBookType` union-hoz: `| "investigative"`
- `BookTypeSpecificData` interface-hez új mezők:
  - `investigationSubject?: string` — Ki/mi az ügy tárgya
  - `investigationScope?: "individual" | "organization" | "system" | "event"` — Egyén, szervezet, rendszer vagy esemény
  - `evidenceTypes?: string[]` — Bizonyítéktípusok (dokumentumok, interjúk, pénzügyi adatok, stb.)
  - `investigatorRole?: "first-person" | "third-person" | "team"` — Az oknyomozó szerepe
  - `timelinePeriod?: string` — A vizsgált időszak
  - `keyPlayers?: string` — Főbb szereplők/érintettek
  - `centralQuestion?: string` — A fő kérdés amire a könyv válaszol
  - `investigationTone?: "factual" | "dramatic" | "sardonic" | "urgent"`
- `NONFICTION_BOOK_TYPES` tömbbe: `{ id: "investigative", icon: "🔍", title: "Oknyomozó", description: "Valós ügyek feltárása bizonyítékokkal, dokumentumfilm-szerű stílusban", example: "All the President's Men, Feltárt igazságok" }`

### 2. `src/components/wizard/steps/Step5BookTypeData.tsx` — Wizard form
- Új `renderInvestigativeForm()` metódus az oknyomozó-specifikus mezőkkel
- `renderFormContent()` switch-ben: `case "investigative": return renderInvestigativeForm();`
- `getBookTypeTitle()` map-ben: `"investigative": "Oknyomozó könyv"`

### 3. `src/components/wizard/steps/Step3BookType.tsx` — Grid layout
- A grid `lg:grid-cols-5`-ről `lg:grid-cols-5`-ön marad (11 elem, 3. sor 1 elemmel), vagy átállítjuk ha szükséges

### 4. `supabase/functions/generate-story/index.ts` — Történetgeneráló prompt
- Új `INVESTIGATIVE_SYSTEM_PROMPT` konstans, ami oknyomozó könyv struktúrát generál:
  - JSON output: `title`, `centralQuestion`, `subject`, `timeline`, `keyPlayers[]`, `evidenceMap`, `chapters[]` (kronologikus feltárás ívvel)
  - A prompt felismeri ha `nonfiction_book_type === "investigative"` és a speciális promptot használja

### 5. `supabase/functions/write-section/index.ts` — Szekció-író prompt
- Új `INVESTIGATIVE_SYSTEM_PROMPT` a non-fiction ág mellé, ami az oknyomozó stílust kényszeríti:
  - Jelenetezés tényalapú narrációval (nem fikció, de "show don't tell" technikával)
  - Bizonyítékok inline bemutatása (dátumok, dokumentum-részletek, idézetek)
  - Feszültségépítés a feltárás ritmusával
  - Az oknyomozó mint narrátor/guide
- A `isFiction` / non-fiction elágazásban: ha `project.nonfiction_book_type === "investigative"` → az oknyomozó promptot kapja

### 6. `supabase/functions/generate-section-outline/index.ts` — Jelenet-outline
- Új oknyomozó-specifikus outline prompt, ami szekciókra bontja a fejezetet:
  - Bemutatás → Bizonyíték → Elemzés → Következtetés struktúrával
  - Minden szekcióhoz: milyen bizonyíték kerül bemutatásra, ki szólal meg, mi a feszültségpont

## Változtatások összefoglalója

| Fájl | Változás |
|------|----------|
| `src/types/wizard.ts` | Új típus + mezők + NONFICTION_BOOK_TYPES bővítés |
| `Step5BookTypeData.tsx` | Új `renderInvestigativeForm()` + switch case |
| `Step3BookType.tsx` | Nincs változás (automatikusan rendereli) |
| `generate-story/index.ts` | Oknyomozó prompt + elágazás |
| `write-section/index.ts` | Oknyomozó system prompt + elágazás |
| `generate-section-outline/index.ts` | Oknyomozó outline prompt |

Adatbázis migráció NEM szükséges — a `nonfiction_book_type` mező szabad text, a `book_type_data` JSONB.

