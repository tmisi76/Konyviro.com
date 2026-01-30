
# Lektorálás Átalakítás + Motor Jelzés Mindenhol + Fejezet Szintű Lektorálás

## Áttekintés

A lektorálás szolgáltatás átalakítása Stripe fizetésről szó kredit alapúra, AI motor jelzések hozzáadása a szoftver minden AI-t használó részéhez, valamint fejezet szintű streaming lektorálás bevezetése a szerkesztőben.

## 1. Szó Kredit Alapú Lektorálás

### Költség Képlet
```
10,000 szó lektorálás ≈ $0.146 (Gemini 2.5 Pro API)
$0.146 ≈ 55 Ft
55 Ft / 0.07 Ft/szó = ~800 szó kredit

Szorzó: 8% (0.08)
Minimum: 500 kredit
```

### Konstansok Bővítése
**Fájl:** `src/constants/credits.ts`
```typescript
export const PROOFREADING_CREDIT_MULTIPLIER = 0.08;
export const PROOFREADING_MIN_CREDITS = 500;

export function calculateProofreadingCredits(wordCount: number): number {
  const calculated = Math.round(wordCount * PROOFREADING_CREDIT_MULTIPLIER);
  return Math.max(calculated, PROOFREADING_MIN_CREDITS);
}
```

### Hook Módosítása
**Fájl:** `src/hooks/useProofreading.ts`
- Stripe vásárlás eltávolítása
- Kredit ellenőrzés és levonás hozzáadása
- Új `startProofreading()` függvény

### UI Módosítása
**Fájl:** `src/components/proofreading/ProofreadingTab.tsx`
- Ár helyett kredit költség megjelenítése
- "Megvásárlás" gomb → "Indítás" gomb
- Motor jelzés hozzáadása (Gemini 2.5 Pro badge)

```text
┌─────────────────────────────────────────────────────────────────┐
│  AI Lektor Szolgáltatás                                         │
│  ⚡ Powered by Gemini 2.5 Pro                                   │
│                                                                 │
│  📊 Könyv hossza: 45,000 szó                                   │
│  💰 Szükséges kredit: 3,600 szó kredit                         │
│  ✅ Elérhető: 12,500 szó kredit                                │
│                                                                 │
│  [🚀 Lektorálás Indítása]                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Új Edge Function
**Fájl:** `supabase/functions/start-proofreading/index.ts`
- Kredit egyenleg ellenőrzése
- Kredit levonás (`use_extra_credits` RPC)
- Order létrehozása (stripe_session_id nullable)
- `process-proofreading` trigger

### Adatbázis Módosítás
- `proofreading_orders.stripe_session_id` → nullable
- Új mező: `credits_used` (integer)

## 2. AI Motor Jelzés Mindenhol

### Dinamikus Motor Név Megjelenítés

| Komponens | Jelenlegi | Új Megjelenítés |
|-----------|-----------|-----------------|
| `AIAssistantPanel.tsx` | Gemini Flash badge | Dinamikus: `useAIModel()` |
| `ProofreadingTab.tsx` | "Claude Opus 4.5" | "⚡ Gemini 2.5 Pro (prémium lektorálás)" |
| `AutoWritePanel.tsx` | Nincs | Motor badge hozzáadása |
| `FloatingToolbar.tsx` | Nincs | Tooltip-ben motor név |
| Fejezet lektorálás | N/A | Motor badge streaming közben |

### Motor Info Komponens
**Fájl:** `src/components/ui/ai-model-badge.tsx` (ÚJ)
```typescript
interface AIModelBadgeProps {
  modelId: string;
  variant?: "default" | "minimal" | "detailed";
}

// Megjelenítés:
// default: "⚡ Gemini 2.5 Pro"
// minimal: "AI"
// detailed: "⚡ Gemini 2.5 Pro - Prémium magyar nyelvtan"
```

### Lektorálási Motor Leírás
```text
"Gemini 2.5 Pro a legfejlettebb AI modell a magyar nyelvtan, 
helyesírás és stilisztika terén. Professzionális minőségű 
lektorálást biztosít."
```

## 3. Fejezet Szintű Streaming Lektorálás

### UI Elhelyezés
A `ChapterSidebar`-ban jobb klikk menüben vagy a fejezet szerkesztőben:

**Opció A:** Context Menu (jobb klikk a fejezeten)
```text
┌─────────────────────┐
│ Átnevezés           │
│ Duplikálás          │
│ ─────────────────── │
│ 🔍 Fejezet lektorálása │
│ ─────────────────── │
│ Törlés              │
└─────────────────────┘
```

**Opció B:** FloatingToolbar bővítése
- Új "Lektorálás" gomb a kijelölt szöveg toolbarban
- Teljes fejezet lektorálás gomb a szerkesztőben

### Fejezet Lektorálás Flow
1. Felhasználó kiválasztja a fejezetet
2. Klikk a "Lektorálás" gombra
3. Kredit ellenőrzés (fejezet szó × 0.08)
4. Streaming válasz megjelenítése
5. Átírás helyben az editorban

### Új Edge Function
**Fájl:** `supabase/functions/proofread-chapter/index.ts`
- Egyetlen fejezet lektorálása
- Streaming válasz (SSE)
- Kredit levonás a fejezet szavai alapján

### Frontend Streaming
**Fájl:** `src/hooks/useChapterProofreading.ts` (ÚJ)
```typescript
export function useChapterProofreading() {
  const [isProofreading, setIsProofreading] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  
  const proofreadChapter = async (chapterId: string) => {
    // 1. Kredit ellenőrzés
    // 2. SSE stream indítása
    // 3. Token-by-token megjelenítés
    // 4. Chapter content frissítése befejezéskor
  };
}
```

### Szerkesztő Integrálás
**Fájl:** `src/pages/ProjectEditor.tsx`
- Új "Fejezet lektorálása" gomb a fejezet header-ben
- Streaming közben overlay a tartalmon
- Animált szöveg csere effekt

## 4. Fájl Változtatások Összefoglalója

| Fájl | Változás |
|------|----------|
| `src/constants/credits.ts` | Lektorálási kredit konstansok |
| `src/hooks/useProofreading.ts` | Stripe → kredit alapú |
| `src/hooks/useChapterProofreading.ts` | ÚJ: Fejezet szintű streaming |
| `src/components/proofreading/ProofreadingTab.tsx` | Kredit UI + motor badge |
| `src/components/ui/ai-model-badge.tsx` | ÚJ: Motor jelző komponens |
| `src/components/editor/AIAssistantPanel.tsx` | Motor badge már kész ✅ |
| `src/components/editor/ChapterSidebar.tsx` | Lektorálás context menu |
| `src/components/editor/AutoWritePanel.tsx` | Motor badge hozzáadása |
| `supabase/functions/start-proofreading/index.ts` | ÚJ: Kredit alapú indítás |
| `supabase/functions/proofread-chapter/index.ts` | ÚJ: Streaming fejezet lektorálás |
| `supabase/functions/create-proofreading-purchase/index.ts` | TÖRLÉS (vagy archív) |
| Migráció | `stripe_session_id` nullable + `credits_used` mező |

## 5. Törlendő/Archíválandó

| Fájl | Ok |
|------|-----|
| `create-proofreading-purchase/index.ts` | Stripe már nem kell |
| `proofreading-webhook/index.ts` | Stripe webhook már nem kell |

## 6. Biztonsági Megfontolások

- Kredit levonás ELŐTT történik (nem utána)
- Edge function ellenőrzi a projekt tulajdonjogot
- Rate limiting a streaming endpoint-on
- Kredit visszatérítés hiba esetén (opcionális)

## 7. Felhasználói Élmény

### Teljes Könyv Lektorálás (Lektorálás Tab)
```text
┌─────────────────────────────────────────────────────────────────┐
│  AI Lektor Szolgáltatás                                         │
│  ⚡ Powered by Gemini 2.5 Pro                                   │
│                                                                 │
│  A Gemini 2.5 Pro a legfejlettebb AI modell a magyar           │
│  nyelvtan és stilisztika terén. Prémium minőségű lektorálást   │
│  biztosít könyved számára.                                      │
│                                                                 │
│  📊 45,000 szó • 12 fejezet                                    │
│  💰 3,600 szó kredit szükséges                                 │
│  ✅ 12,500 kredit elérhető                                     │
│                                                                 │
│  [🚀 Teljes Könyv Lektorálása]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fejezet Szintű Lektorálás (Szerkesztőben)
```text
┌─────────────────────────────────────────────────────────────────┐
│  📖 2. fejezet: A titokzatos levél                              │
│  [Lektorálás ▼] ← kattintásra dropdown                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ⚡ Gemini 2.5 Pro lektorálás                              │  │
│  │    Fejezet: 2,400 szó → 192 kredit                       │  │
│  │    [Indítás]                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Szöveg stream-ben frissül...                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 8. Implementációs Sorrend

1. **Adatbázis migráció** - nullable stripe_session_id + credits_used
2. **Konstansok** - lektorálási kredit számítás
3. **start-proofreading** edge function - kredit alapú indítás
4. **useProofreading hook** - Stripe eltávolítása
5. **ProofreadingTab** - kredit UI + motor badge
6. **ai-model-badge** komponens - újrafelhasználható motor jelző
7. **proofread-chapter** edge function - streaming fejezet lektorálás
8. **useChapterProofreading** hook - streaming kezelés
9. **ChapterSidebar/Editor** - fejezet lektorálás UI
10. **Törlés** - create-proofreading-purchase, proofreading-webhook
