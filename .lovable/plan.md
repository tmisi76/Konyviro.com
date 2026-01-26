
# Terv: Borító Generálás Költség Megjelenítése és Kredit Levonás

## Összefoglaló
A borítókészítő funkció működik (a logok alapján sikeresen generált képeket). Implementálni kell:
1. A költség megjelenítését a felhasználói felületen
2. A kredit ellenőrzését és levonását generálás előtt

## Költség Definíció

| Művelet | Kredit Költség |
|---------|----------------|
| **Borító generálás** | 2000 szó |
| **Borító szerkesztés (inpainting)** | 2000 szó |

**Indoklás:** A `google/gemini-3-pro-image-preview` modell ~2000-3000 tokent használ képenként, ami szó-egyenértékben kb. 1500-2000 szónak felel meg. A 2000 szó konzisztens és könnyen érthető érték.

## Implementáció Lépései

### 1. Konstans Definiálása
Új fájl: `src/constants/credits.ts`
```text
┌──────────────────────────────────┐
│ COVER_GENERATION_COST = 2000     │
│ COVER_EDIT_COST = 2000           │
└──────────────────────────────────┘
```

### 2. CoverDesigner.tsx Módosítások
- Költség megjelenítése a generálás gomb mellett
- "Maradék kredit" ellenőrzés a generálás előtt
- Hibaüzenet ha nincs elég kredit

```text
┌─────────────────────────────────────────┐
│     🎨 Borító Tervező                   │
├─────────────────────────────────────────┤
│                                         │
│  [Űrlap mezők...]                       │
│                                         │
│  ⚡ Költség: 2000 szó kredit            │
│                                         │
│  [✨ Borító Generálása]                 │
│                                         │
│  ─────────────────────────────────────  │
│  💡 Tip: Ellenőrizd a havi keretedet   │
│      a beállításoknál                   │
└─────────────────────────────────────────┘
```

### 3. Backend Kredit Levonás
`supabase/functions/generate-cover/index.ts` módosítása:

**Új logika a generálás ELŐTT:**
1. Ellenőrizni, hogy a felhasználónak van-e elég kreditje (havi keret + extra)
2. Ha nincs: 402 hibát visszaadni

**Új logika a generálás UTÁN:**
3. Kredit levonás a meglévő `increment_words_generated` és `use_extra_credits` RPC függvényekkel

```text
┌─────────────────────────────────────────┐
│ generate-cover Edge Function            │
├─────────────────────────────────────────┤
│                                         │
│  1. JWT ellenőrzés ✓                    │
│  2. Projekt tulajdonjog ✓               │
│  3. ⭐ KREDIT ELLENŐRZÉS (új!)          │
│     - profiles.monthly_word_limit       │
│     - user_usage.words_generated        │
│     - profiles.extra_words_balance      │
│     - Ha limit - used + extra < 2000:   │
│       → 402 "Nincs elég kredit"         │
│  4. AI Képgenerálás                     │
│  5. Storage feltöltés                   │
│  6. covers tábla rekord                 │
│  7. ⭐ KREDIT LEVONÁS (új!)             │
│     - increment_words_generated(2000)   │
│     - VAGY use_extra_credits()          │
│  8. Visszatérés                         │
└─────────────────────────────────────────┘
```

### 4. edit-cover-inpainting Módosítás
Ugyanaz a logika mint a generate-cover-nél.

### 5. Frontend Kredit Ellenőrzés
A `useSubscription` hook `canGenerateWords(2000)` függvényét használjuk a gomb letiltásához ha nincs elég kredit.

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `src/constants/credits.ts` | ÚJ - kredit konstansok |
| `src/pages/CoverDesigner.tsx` | Költség megjelenítés, kredit ellenőrzés UI |
| `src/components/covers/EditCoverModal.tsx` | Költség megjelenítés |
| `supabase/functions/generate-cover/index.ts` | Kredit validáció és levonás |
| `supabase/functions/edit-cover-inpainting/index.ts` | Kredit validáció és levonás |

## UI Változások Részletesen

### Generálás Gomb Környezete
```text
┌──────────────────────────────────────┐
│  ⚡ Generálás költsége: 2000 szó     │
│                                      │
│  [✨ Borító Generálása]              │
│   (vagy ha nincs kredit:)            │
│  [🔒 Nincs elég kredit] (disabled)   │
│                                      │
│  Maradék keret: 15,000 szó           │
└──────────────────────────────────────┘
```

### Szerkesztés Modal
Hasonló költség megjelenítés az EditCoverModal-ban is.

## Hibaüzenetek

| Helyzet | Üzenet |
|---------|--------|
| Nincs elég kredit (frontend) | "Nincs elég szó kredited. A borító generálás 2000 szó kreditet igényel." |
| Nincs elég kredit (backend 402) | "Nincs elég kredit. Vásárolj extra kreditet vagy válts nagyobb csomagra." |
| Sikeres generálás | "Borító elkészült! 2000 szó kredit levonva." |

## Technikai Részletek

### Kredit Logika (write-section mintájára)
```typescript
// 1. Lekérdezés
const { data: profile } = await supabase.from("profiles")
  .select("monthly_word_limit, extra_words_balance")
  .eq("user_id", userId).single();

const { data: usage } = await supabase.from("user_usage")
  .select("words_generated")
  .eq("user_id", userId)
  .eq("month", currentMonth).single();

// 2. Ellenőrzés
const limit = profile.monthly_word_limit || 5000;
const used = usage?.words_generated || 0;
const extra = profile.extra_words_balance || 0;
const remaining = Math.max(0, limit - used);
const total = remaining + extra;

if (total < COVER_COST) {
  return 402 error;
}

// 3. Generálás után: levonás
if (limit === -1 || COVER_COST <= remaining) {
  // Havi keretből
  await supabase.rpc("increment_words_generated", {...});
} else {
  // Vegyes (havi + extra)
  if (remaining > 0) {
    await supabase.rpc("increment_words_generated", {...});
  }
  const fromExtra = COVER_COST - remaining;
  await supabase.rpc("use_extra_credits", {...});
}
```

## Tesztelési Checklist
- [ ] Költség megjelenik a generálás gombnál
- [ ] Gomb letiltott ha nincs elég kredit
- [ ] Generálás után a kredit levonásra kerül
- [ ] UsagePanel frissül a levonás után
- [ ] 402 hiba megfelelően kezelve
- [ ] Extra kredit helyesen használva ha a havi elfogyott
