

# Teljes fejlesztési fázis -- Implementációs terv

Ez a terv 10 nagyobb fejlesztési modult tartalmaz. A méret miatt **fázisokra bontva**, egyenként jóváhagyva kell implementálni.

---

## 0. Azonnali javítás: Szókorlát emelése 100 000-re

**Fájlok:**
- `src/components/wizard/steps/Step5BookTypeData.tsx` -- 9 helyen `max={50000}` → `max={100000}`
- `src/components/wizard/steps/Step3BasicInfo.tsx` -- `max={50000}` → `max={100000}`, skála jelzők frissítése
- `src/components/projects/steps/StepDetails.tsx` -- `lengthPresets` frissítése: Regény → 80 000, Hosszú → 100 000

---

## 1. Dark/Light téma (kis befektetés, nagy hatás)

A `.dark` CSS változók már definiálva vannak az `index.css`-ben, a `next-themes` csomag telepítve van.

**Teendők:**
- `ThemeProvider` hozzáadása az `App.tsx`-hez (`next-themes`)
- Témaváltó komponens (`ThemeToggle`) létrehozása (Sun/Moon ikon)
- Beépítés: Settings oldal, szerkesztő fejléc, landing Navbar
- `index.html`-ben `<html>` tag kiegészítése a `suppressHydrationWarning` attribútummal

---

## 2. Testimonials aktiválása (DB-ből, admin kezelhető)

**DB migráció:** Új `testimonials` tábla (id, author_name, author_role, content, rating, avatar_url, is_active, sort_order, created_at)

**Fájlok:**
- `src/components/landing/TestimonialsSection.tsx` -- átírás DB-ből töltésre (`useQuery`)
- `src/pages/Index.tsx` -- komment eltávolítása, import aktiválása
- Új admin oldal: `src/pages/admin/AdminTestimonials.tsx` -- CRUD felület
- Admin navigáció bővítése az `AdminLayout.tsx`-ben

---

## 3. Többnyelvűség (i18n rendszer)

**Architektúra:**
- `src/i18n/` mappa: `translations/hu.json`, `translations/en.json`, `I18nContext.tsx`, `useTranslation.ts`
- DB: `system_settings` táblába `default_language` és `active_languages` kulcsok (superadmin állítja)
- Ha 1 aktív nyelv → automatikusan az aktív, nincs választó
- Ha 2+ aktív nyelv → `LanguageSwitcher` komponens zászlókkal (🇭🇺/🇬🇧) a Navbar-ban és Settings-ben
- SuperAdmin: `AdminSettings.tsx`-ben nyelvbeállítás szekció (default nyelv, aktív nyelvek)

**Megvalósítás fázisai:**
1. Context + hook + JSON struktúra létrehozása
2. Landing page stringek kiszervezése (Navbar, Hero, Features, FAQ, Footer, Pricing)
3. Auth oldal stringek
4. Dashboard és szerkesztő stringek (fokozatosan)

---

## 4. Demo mód (regisztráció nélküli kipróbálás)

**Koncepció:** Landing page "Próbáld ki" gomb → `/demo` route → korlátozott szerkesztő 500 szó AI generálással, localStorage-ban tárolt adat, regisztrációs CTA overlay.

**Fájlok:**
- Új: `src/pages/Demo.tsx` -- egyszerűsített szerkesztő felület
- Új: `src/components/demo/DemoEditor.tsx` -- blokk szerkesztő regisztráció nélkül
- Új: `src/components/demo/DemoUpgradeOverlay.tsx` -- CTA overlay
- `src/components/landing/HeroSection.tsx` -- "Próbáld ki" gomb
- `src/App.tsx` -- `/demo` route hozzáadása (publikus)

---

## 5. Onboarding email sorozat (drip campaign)

**DB migráció:** Új `drip_campaigns` tábla (id, user_id, step, sent_at, next_send_at, status)

**Edge function:** `supabase/functions/process-drip-campaign/index.ts`
- Cron-szerűen hívható (Supabase scheduled function)
- 3 lépés: 1. nap (tippek), 3. nap (funkciók), 7. nap (upgrade CTA)
- Email sablonok a meglévő `email_templates` táblából

**Trigger:** `handle_new_user()` trigger bővítése: drip campaign rekord létrehozása

---

## 6. Verziókezelés (fejezet snapshotokok)

**DB migráció:** Új `chapter_versions` tábla (id, chapter_id, content, word_count, created_by, trigger_type ['manual', 'auto', 'ai_rewrite'], created_at). RLS: user saját projektjeihez tartozó fejezetek verzióit látja.

**Fájlok:**
- Új: `src/hooks/useChapterVersions.ts` -- snapshot CRUD
- `src/components/editor/EditorView.tsx` -- "Verzió visszaállítás" gomb
- Új: `src/components/editor/VersionHistoryPanel.tsx` -- verziók listája, visszaállítás
- Edge function-ök módosítása: `write-section`, `refine-chapter` -- auto snapshot mentés AI átírás előtt

---

## 7. AI Lektorálás

**Új edge function:** `supabase/functions/proofread/index.ts`
- Bemenet: szöveg + nyelv
- AI modell (Gemini) elemzi: nyelvtan, helyesírás, stilisztika
- Kimenet: javaslatok tömb (position, original, suggestion, type, explanation)

**Fájlok:**
- Új: `src/hooks/useProofreading.ts`
- Új: `src/components/editor/ProofreadingPanel.tsx` -- javaslatok listája, elfogadás/elutasítás
- `src/components/editor/EditorView.tsx` -- "Lektorálás" gomb és panel integráció

---

## 8. Szószedet / Glosszárium modul

**DB migráció:** Új `glossary_terms` tábla (id, project_id, term, definition, category, aliases[], created_at, updated_at). RLS: projekt tulajdonos.

**Fájlok:**
- Új: `src/hooks/useGlossary.ts` -- CRUD
- Új: `src/components/glossary/GlossaryView.tsx` -- szószedet nézet (keresés, szűrés, hozzáadás)
- Új: `src/components/glossary/AddTermModal.tsx`
- `src/pages/ProjectEditor.tsx` -- új "Szószedet" tab a módváltóban

---

## 9. Együttműködés (Collaboration)

**DB migrációk:**
- Új `project_collaborators` tábla (id, project_id, user_id, role ['editor', 'reader'], invited_at, accepted_at, invited_by)
- `projects` és `chapters` RLS policy bővítése: collaborator-ok is láthassák/szerkeszthessék

**Fájlok:**
- Új: `src/hooks/useCollaborators.ts`
- Új: `src/components/collaboration/InviteCollaboratorModal.tsx`
- Új: `src/components/collaboration/CollaboratorsList.tsx`
- `src/pages/ProjectEditor.tsx` -- megosztás gomb, kollaborátor jelenlét jelzés
- `src/pages/Dashboard.tsx` -- "Megosztott velem" szekció

---

## 10. Publikus Könyv Galériia

**DB migráció:** Új `published_books` tábla (id, project_id, user_id, title, description, genre, cover_url, is_featured, view_count, like_count, published_at). RLS: bárki olvashat, tulajdonos szerkeszthet.

**Fájlok:**
- Új: `src/pages/Gallery.tsx` -- publikus böngészhető galériia
- Új: `src/components/gallery/BookCard.tsx`, `GalleryFilters.tsx`
- `src/App.tsx` -- `/gallery` publikus route
- `src/pages/ProjectEditor.tsx` vagy `ProjectExport.tsx` -- "Publikálás a galériába" gomb
- SEO: meta tagek minden könyvoldalon

---

## Ajánlott implementációs sorrend

| Fázis | Modul | Becsült méret |
|-------|-------|---------------|
| A | Szókorlát emelés (0) + Dark/Light (1) + Testimonials (2) | Kicsi-közepes |
| B | i18n rendszer (3) | Közepes-nagy |
| C | Demo mód (4) + Onboarding email (5) | Közepes |
| D | Verziókezelés (6) + AI Lektorálás (7) + Szószedet (8) | Nagy |
| E | Együttműködés (9) + Galériia (10) | Nagy |

**Javaslatom:** Fázisonként induljon az implementáció. Kezdjük az **A fázissal** (szókorlát + dark mode + testimonials), ami gyors eredményt hoz.

