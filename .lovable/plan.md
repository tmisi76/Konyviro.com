
# Lektorálás Mentés Javítása

## Azonosított Hibák

### 1. Stale Closure Probléma
A `useChapterProofreading` hook a callback-eket az `options` objektumból olvassa, de ez minden render-nél új referenciát kap. A streaming közben a komponens többször is újra renderelődhet (pl. `streamedContent` változáskor), ami miatt az eredeti `onComplete` callback elavulttá válik.

### 2. Async Callback Nem Várt
A hook így hívja a callback-et:
```typescript
options?.onComplete?.(fullContent);  // Nincs await!
```

De a callback async:
```typescript
onComplete: async () => {
  await onRefreshChapter();  // Ez nem fut le, mielőtt a hook továbblép
}
```

### 3. Blokkok Nem Töltődnek Újra
Bár a backend törli a blokkokat, a frontend `forceRefreshBlocks` nem fut le megfelelően, mert az `onComplete` vagy nem hívódik, vagy nem várja meg.

## Technikai Megoldás

### A) `useChapterProofreading.ts` - Stabil Callback Referenciák

Használjunk `useRef`-et a callback-ekhez, hogy mindig a legfrissebb verziót hívjuk:

```typescript
import { useState, useCallback, useRef, useEffect } from "react";

export function useChapterProofreading(options?: UseChapterProofreadingOptions) {
  // ... existing state ...
  
  // Stabil referenciák a callback-ekhez
  const onCompleteRef = useRef(options?.onComplete);
  const onErrorRef = useRef(options?.onError);
  
  // Frissítjük a ref-eket minden renderkor
  useEffect(() => {
    onCompleteRef.current = options?.onComplete;
    onErrorRef.current = options?.onError;
  }, [options?.onComplete, options?.onError]);
  
  const proofreadChapter = useCallback(async (chapterId: string, wordCount: number) => {
    // ... existing logic ...
    
    if (json.done) {
      setProgress(100);
      
      // Await-tel hívjuk, a ref-ből (mindig friss)
      if (onCompleteRef.current) {
        await onCompleteRef.current(fullContent);
      }
      
      toast.success("Fejezet sikeresen lektorálva!", ...);
    }
    
    // ... existing logic ...
  }, [getRemainingWords]);  // options eltávolítva a dependency-ből!
}
```

### B) `ChapterSidebar.tsx` - useCallback a Callback-hez

A `ChapterSidebar`-ban a callback-et `useCallback`-kel stabilizáljuk:

```typescript
import { useState, useRef, useCallback } from "react";

// Stabil callback létrehozása
const handleProofreadingComplete = useCallback(async (newContent: string) => {
  if (onRefreshChapter) {
    setIsRefreshing(true);
    try {
      await onRefreshChapter();
    } finally {
      setIsRefreshing(false);
    }
  }
}, [onRefreshChapter]);

const { proofreadChapter, isProofreading, progress: proofProgress, reset } = useChapterProofreading({
  onComplete: handleProofreadingComplete,
});
```

### C) Interface Típus Javítása

```typescript
interface UseChapterProofreadingOptions {
  onComplete?: (newContent: string) => void | Promise<void>;  // Promise is megengedett
  onError?: (error: string) => void;
}
```

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `src/hooks/useChapterProofreading.ts` | useRef a callback-ekhez, await az onComplete híváskor, options eltávolítása a dependency-ből |
| `src/components/editor/ChapterSidebar.tsx` | useCallback a callback stabilizálásához |

## Tesztelési Lépések

1. Nyiss meg egy fejezetet
2. Indítsd el a "Fejezet lektorálása" funkciót
3. Várd meg a befejezést
4. Ellenőrizd, hogy:
   - A szerkesztőben az új, lektorált szöveg jelenik meg
   - Nem kell manuálisan frissíteni az oldalt
   - A dialog bezárásakor is marad az új szöveg
