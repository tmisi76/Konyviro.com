# Admin: könyv-belső + költség/bevétel nézet

## Jelenlegi állapot

**Admin → Projektek → [Projekt]** (`/admin/projects/:id`) ma ezt mutatja:
- Szavak, fejezetek, karakterek, létrehozás dátuma
- Tulajdonos kártya (név, csomag, profil link)
- Fejezetek **listája cím + szószám** — **de a fejezet tartalmát NEM lehet megnyitni/elolvasni**
- Karakterek
- Részletek (műfaj, történet ötlet)

**Admin → Felhasználók → [Felhasználó]** (`/admin/users/:id`) ma ezt mutatja:
- Projektek száma, szavak, havi használat, extra egyenleg
- Projektek lista, előfizetés, tevékenység

**Hiányzik mindkettőről:**
- A fejezet **szövegének olvasása** admin felületen
- **AI token-fogyasztás** projekt/user szinten (van `ai_generations` tábla, de nincs használva ezeken az oldalakon)
- **Becsült AI költség** Ft-ban (modellenként eltérő ár — Pro vs Flash)
- **Mit fizetett** a user (előfizetés + extra szó vásárlások + audiobook minutes)
- **Profit/veszteség** számítás (bevétel − AI költség)

## Mit építünk

### 1. AdminProjectDetail kibővítése

**Új statisztika kártyák a meglévő 4 mellé:**
- AI tokenek összesen (input + output szétbontva)
- Becsült AI költség (Ft) — modellenkénti bontással tooltipben
- Generálások száma (db)
- Átlag token / fejezet

**Fejezetek tab átalakítása — olvasható tartalom:**
- A táblázat sorai kattinthatóak / minden sor mellé „Olvasás" gomb
- Megnyit egy modal-t (vagy accordion-t) ami mutatja a fejezet teljes szövegét read-only formázott módon
- Modal fejléc: cím, szószám, státusz, utolsó módosítás
- Modal body: prose styled `chapter.content`
- Hosszú fejezeteknél scrollable, max-h-[80vh]

**Új tab: „AI használat"**
- Lista az `ai_generations` rekordokról erre a projektre szűrve
- Oszlopok: dátum, fejezet, művelet típus (`scene`, `lector`, `outline`, …), modell, prompt token, completion token, becsült Ft
- Modellenkénti összesítő (Gemini 3 Pro vs Flash bontás)

### 2. AdminUserDetail kibővítése

**Új statisztika kártyák:**
- Összes AI token (élete óta)
- Összes AI költség (Ft) — amit az AI hívások ténylegesen kerültek
- Összes bevétel a usertől (Ft)
- **Profit margin** százalékban (zöld ha pozitív, piros ha veszteséges)

**Új tab: „Pénzügy"**
- Bevétel bontás:
  - Aktív előfizetés (csomag, havi díj, mennyi hónapja előfizet → összes)
  - Extra szó vásárlások listája (`credit_purchases` — dátum, szavak, összeg)
  - Audiobook perc vásárlások (`audiobook_credit_purchases`)
  - Összes bevétel
- Költség bontás:
  - Havi AI költség az utolsó 6 hónapra (oszlopdiagram)
  - Total AI költség
- Profit / veszteség: bevétel − AI költség
- Színkódolt jelzés: ha profit margin < 50% → figyelem, ha negatív → piros riasztás

**Új tab: „AI használat"**
- A user összes AI generálása paginated táblában
- Szűrhető projektre, művelet típusra, modellre
- Sorra kattintva ugrik a projekt AI tabjára

### 3. Költség becslő segéd modul

`src/lib/aiCostEstimator.ts` (új fájl):
- Modellenkénti USD/1M token árak (Pro: $1.25 input / $10 output, Flash: $0.30 input / $2.50 output, Flash-Lite olcsóbb, stb.)
- Árfolyam: 395 Ft / USD (admin settingsben felülírható később)
- Függvények:
  - `estimateCostUsd(model, promptTokens, completionTokens)`
  - `estimateCostHuf(model, promptTokens, completionTokens)`
  - `aggregateCosts(generations[])` → `{ totalHuf, byModel: {...} }`

### 4. Új hookok

- `useProjectAIUsage(projectId)` — `ai_generations` lekérdezés projektre
- `useUserAIUsage(userId, filters)` — paginated user-szintű lekérdezés
- `useUserRevenue(userId)` — előfizetés + `credit_purchases` + `audiobook_credit_purchases` aggregálás
- `useChapterContent(chapterId)` — már létezik a project details hookban, de külön lazy-load is jó lehet

## Technikai részletek

**Adatforrások (mind már létező táblák):**
- `chapters.content` — fejezet szöveg (admin user már lát mindent az `is_admin` policy-k miatt → projects, ezen keresztül chapters)
- `ai_generations` — token & modell adat per generálás (van `project_id`, `chapter_id`, `user_id`)
- `credit_purchases` — extra szó vásárlások (`words_purchased`, `amount`, `status='completed'`)
- `audiobook_credit_purchases` — audiobook perc vásárlások
- `profiles.subscription_tier`, `subscription_start_date` — előfizetés bevétel becsléshez

**RLS:** admin user már lát mindent (van `Admins can view all` policy a `projects`, `profiles` és `audiobooks` táblákon), de **nincs admin SELECT policy** a következőkön:
- `chapters` — admin csak owner-ként látja → kell új policy: `Admins can view all chapters`
- `ai_generations` — csak owner látja → kell: `Admins can view all generations`
- `credit_purchases` — csak owner látja → kell: `Admins can view all credit purchases`
- `audiobook_credit_purchases` — csak owner látja → kell: `Admins can view all audiobook purchases`

Ezek **migration-ben** új RLS policy-kat adnak, semmit nem törnek.

**Csomag árak** (bevétel becsléshez): `src/constants/pricing.ts`-ben már lehet hardcoded — ha nincs, hozzáadom (HOBBI 9990, PROFI 19990, INGYENES 0).

**Fejezet olvasó modal:** új komponens `src/components/admin/ChapterContentModal.tsx` — Dialog, prose, scrollable, „Másolás vágólapra" gombbal.

## Fájlok

**Új:**
- `src/lib/aiCostEstimator.ts`
- `src/components/admin/ChapterContentModal.tsx`
- `src/hooks/admin/useProjectAIUsage.ts`
- `src/hooks/admin/useUserAIUsage.ts`
- `src/hooks/admin/useUserRevenue.ts`
- `supabase/migrations/<timestamp>_admin_view_policies.sql` — admin SELECT policy-k

**Módosított:**
- `src/pages/admin/AdminProjectDetail.tsx` — új kártyák, fejezet olvasó, AI tab
- `src/pages/admin/AdminUserDetail.tsx` — új kártyák, Pénzügy tab, AI tab
- `src/hooks/admin/index.ts` — új hookok export
