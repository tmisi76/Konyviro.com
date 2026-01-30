
# Lektorálás UI Javítások

## Azonosított Problémák

1. **Hibás modell kijelzés**: A modal "Gemini 2.5 Pro"-t mutat, de már Claude Sonnet 4.5-re váltottunk
2. **Felesleges szöveg streaming**: A modal mutatja az utolsó 500 karaktert, ami zavaró - elég a progress bar
3. **Mentés nem működik**: Az edge function elmenti a tartalmat, de a frontend nem frissíti megfelelően a blokkokat
4. **Bezárás gomb problémák**: A modal túl gyorsan bezárul a frissítés előtt

## Technikai Megoldások

### 1. Modell név javítása

| Fájl | Változás |
|------|----------|
| `src/components/editor/ChapterSidebar.tsx` | "Gemini 2.5 Pro" → "Claude Sonnet 4.5" |
| `src/components/proofreading/ProofreadingTab.tsx` | "Gemini 2.5 Pro" → "Claude Sonnet 4.5" |
| `src/hooks/useAIModel.ts` | `proofreadingModelName` → "Claude Sonnet 4.5" |

### 2. Streaming szöveg eltávolítása a modalból

A `ChapterSidebar.tsx` lektorálás dialog-ban:
- **Eltávolítás**: A `streamedContent.slice(-500)` megjelenítő blokk
- **Meghagyás**: Csak a progress bar és a "Lektorálás folyamatban..." szöveg

Régi kód:
```tsx
{streamedContent && (
  <div className="max-h-60 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm">
    <p className="whitespace-pre-wrap">{streamedContent.slice(-500)}...</p>
  </div>
)}
```

Új kód: Törlés (nem kell szöveget mutatni)

### 3. Mentés és frissítés javítása

A probléma: A lektorálás sikeres (`proofreadChapter` true-t ad vissza), de a `handleConfirmProofreading` után azonnal visszaáll a modal, és a `handleCloseProofreadingDialog`-ban lévő `onRefreshChapter` nem fut le.

**Megoldás**: A `useChapterProofreading` hook-ban az `onComplete` callback-ben kell meghívni a frissítést, nem a dialog bezáráskor.

A `ChapterSidebar.tsx`-ben:
```tsx
const { proofreadChapter, isProofreading, streamedContent, progress: proofProgress, reset } = useChapterProofreading({
  onComplete: async () => {
    // Fejezet újratöltése a lektorált tartalommal
    if (onRefreshChapter) {
      await onRefreshChapter();
    }
  }
});
```

### 4. Mentés loading state hozzáadása

A bezárás gombhoz loading state, amíg a frissítés fut:
```tsx
const [isRefreshing, setIsRefreshing] = useState(false);

const handleCloseProofreadingDialog = async () => {
  if (isProofreading) return;
  
  if (streamedContent && onRefreshChapter) {
    setIsRefreshing(true);
    await onRefreshChapter();
    setIsRefreshing(false);
  }
  
  setProofreadingChapter(null);
  reset();
};

// A Bezárás gomb:
<Button onClick={handleCloseProofreadingDialog} disabled={isRefreshing}>
  {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
  Bezárás
</Button>
```

## Érintett Fájlok

| Fájl | Változások |
|------|------------|
| `src/components/editor/ChapterSidebar.tsx` | Modell név, streaming szöveg eltávolítása, refresh logika |
| `src/components/proofreading/ProofreadingTab.tsx` | Modell név javítás |
| `src/hooks/useAIModel.ts` | Proofreading model name frissítés |
| `src/constants/credits.ts` | Komment frissítés (Gemini → Claude) |

## Összefoglaló

1. **UI**: Claude Sonnet 4.5 felirat mindenhol
2. **UX**: Csak progress bar, nincs streaming szöveg
3. **Stabilitás**: Refresh a lektorálás végén, loading state a bezárás gombon
4. **Blokkok**: `forceRefreshBlocks` garantálja a szinkront
