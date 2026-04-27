# Új funkciók — 3 fázisos terv

A 8 hiányzó funkcióból most **6-ot** valósítunk meg, a legnagyobb hatású prioritizálás szerint. (A komment-rendszer és helyszínek adatbázis külön, nagyobb körök — szólj, ha érdekel.)

---

## 1. fázis — AI Flow funkciók (legnagyobb wow-faktor)

A "leülök a géphez és azonnal írok" élmény. Ez a 3 feature együtt egy összefüggő narratívát ad: **"a szoftver tudja, hol tartottál, és segít folytatni."**

### 1.1 🔄 Azonnali Flow — AI Recap a szerkesztő tetején

Amikor megnyitsz egy projektet, egy összecsukható kártya a szerkesztő tetején:
- AI összefoglaló az utolsó befejezett fejezetről (3-4 mondat)
- Mit hagytál félbe (utolsó bekezdés idézet)
- 2-3 javasolt következő lépés ("Folytasd a párbeszédet X-szel", "Vezesd be a fordulatot Y-ról")

### 1.2 ⚡ "AI Folytatás" gomb — kurzor pozíciótól

A szerkesztőben egy lebegő gomb a kurzor mellett (és az AI Assistant Panel-ben):
- "Folytatás 1 bekezdéssel a TE stílusodban"
- Beolvassa az előző 500-1000 szót, a karaktereket, a story_arc-ot, a stílusprofilodat
- Generál 1-3 bekezdést, amit beilleszthetsz vagy elvethetsz

### 1.3 🎓 Plot Twist Generator — "Megakadtam, adj 3 csavart"

Új gomb az AI Assistant Panel-ben:
- Megnézi az eddigi cselekményt + karaktereket + műfajt
- Visszaad **3 különböző** plot twist javaslatot, mindegyikhez 1-2 mondatos magyarázat, hogy miért logikus

### Backend (1. fázis)
- `chapter-recap` edge function — Lovable AI (gemini-2.5-flash), 1500 szóból generál összefoglalót
- `ai-continue-text` edge function — kontextus (előző bekezdések + karakter + stílusprofil) + folytatás
- `suggest-plot-twists` edge function — kontextus + 3 strukturált javaslat (tool calling)
- Nincs új tábla — minden meglévő adatból dolgozik

### Frontend (1. fázis)
- `src/components/editor/ChapterRecapCard.tsx` — összecsukható kártya tetején
- `src/components/editor/AIContinueButton.tsx` — lebegő gomb + integráció az AI Assistant Panel-be
- `src/components/editor/PlotTwistSuggestions.tsx` — modal 3 javaslattal

---

## 2. fázis — Csapat kollaboráció UI

A `project_collaborators` tábla már létezik, csak felület hiányzik.

### 2.1 Kollaborátor kezelő panel
- Új "Csapat" tab a projekt beállításokban
- Email-alapú meghívás (writer / reader szerepkörrel)
- Meghívó email Resend-en keresztül (lokalizált magyar template)
- Listanézet: aktív kollaborátorok, függő meghívások, eltávolítás

### 2.2 RLS frissítés
A `chapters`, `blocks`, `characters` táblák RLS policy-jét bővíteni kell, hogy a `project_collaborators`-ban szereplő userek is hozzáférjenek a szerepkörük szerint:
- `reader`: SELECT
- `editor`: SELECT + UPDATE + INSERT

### 2.3 Meghívás flow
- Új user-nek auto-fiók (signup link), létező usernek azonnal hozzáférés
- `accepted_at` jelölés meghívó link kattintásakor

### Backend (2. fázis)
- `invite-collaborator` edge function (meghívás + email)
- `accept-collaboration` edge function (token-alapú elfogadás)
- Migráció: helper függvény `is_project_collaborator(_project_id, _role)` és frissített RLS policy-k

### Frontend (2. fázis)
- `src/components/collaboration/CollaboratorsPanel.tsx`
- `src/components/collaboration/InviteCollaboratorDialog.tsx`
- `src/pages/AcceptInvitation.tsx` (új route: `/invite/:token`)

---

## 3. fázis — KDP Export Preset + Sorozat konzisztencia UI + Karakter háló

### 3.1 📐 KDP (Kindle Direct Publishing) export preset
Új preset az export modal-ban:
- Trim size: 6"×9" (15.24×22.86 cm) — KDP standard
- Margók: 0.75" külső, 0.875" belső gutter (300+ oldalas könyvhöz)
- Tartalomjegyzék automatikus generálás, oldalszámozással
- Page break minden fejezet előtt
- Címoldal + copyright oldal + tartalomjegyzék
- Egyetlen kattintás → KDP-kompatibilis PDF

Az `export-book` edge function-be új `preset: "kdp"` paraméter, ami felülírja a CloudConvert beállításokat.

### 3.2 🚨 Sorozat konzisztencia figyelmeztetések UI
A `series_consistency_warnings` tábla már létezik, csak megjelenítés kell:
- Új panel a szerkesztőben: "Sorozat-figyelmeztetések" badge counter-rel
- Listanézet: súlyosság szerint csoportosítva (kritikus / közepes / kisebb)
- Minden warning-hez: melyik kötetben jelent meg az ellentmondás, javasolt megoldás
- Auto-trigger: új fejezet befejezésekor automatikusan lefuttatja a check-et háttérben

### 3.3 🔗 Karakter kapcsolati háló — vizuális
Új `react-flow` alapú graph view:
- Csomópontok = karakterek (avatárral)
- Élek = kapcsolatok (típus szerint színezve: család=kék, szerelmi=piros, ellenség=fekete, barát=zöld)
- Drag-n-drop pozícionálás (pozíció mentve a karakter `metadata` mezőjébe)
- Kattintás csomópontra → karakter modal
- Új kapcsolat húzással hozzáadható

### Backend (3. fázis)
- Csak `export-book` bővítés (KDP preset)
- Auto-trigger: `write-section` befejezésekor háttérben hívja a `check-series-consistency`-t

### Frontend (3. fázis)
- `src/components/export/KDPPresetCard.tsx` az export modal-ban
- `src/components/series/ConsistencyWarningsPanel.tsx`
- `src/components/characters/CharacterNetworkGraph.tsx` (`react-flow` lib telepítése)

---

## Kihagyott funkciók (külön körben)

Ezeket nem teszem be a tervbe most, mert mindegyik nagyobb feature és külön döntést igényel:

- **💬 Inline komment / javaslat rendszer** — új tábla (`comments`), Google Docs-szerű margó-kommentek, megoldatlan/megoldott állapotok. Nagy munka, külön kör.
- **🌍 Helyszínek és világ-szabályok adatbázis** — új `locations` és `world_rules` táblák, wizard step, UI panel. Külön kör, mert érinti a writing engine prompt-jait is.

---

## Javasolt sorrend és credit-költség

| Fázis | Idő | Új credit-költség |
|---|---|---|
| 1. AI Flow (recap + continue + twists) | gyors | recap: 200 / continue: 500 / twists: 800 |
| 2. Kollaboráció | közepes | nincs (ingyenes) |
| 3. KDP + konzisztencia UI + háló | közepes | sorozat-check: 1500 (már létezik) |

Mindhárom fázis külön mérföldkő, külön kipróbálható és kiszállítható. Javaslat: kezdjük az **1. fázissal**, mert ez ad azonnal érzékelhető wow-élményt a felhasználóknak az író felületen.

Hagyd jóvá a tervet, és nekiállok a 1. fázisnak. Ha valamit átrendeznél, vagy a kihagyott funkciók (kommentek / helyszínek) egyikét most szeretnéd a tervbe — szólj.
