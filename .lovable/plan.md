
# Terv: Fejezet váltás loading állapot

## Probléma
Amikor egy másik fejezetre kattintunk, 2-4 másodperc telik el a blokkok betöltésével, de ez idő alatt az előző fejezet tartalma marad látható. Ez zavaró UX, mert a felhasználó azt hiheti, hogy nem történt semmi.

## Megoldás
Bevezetünk egy `isLoadingBlocks` állapotot a `useEditorData` hookba, ami jelzi a fejezet blokkok betöltési folyamatát. Amíg a blokkok töltődnek, az `EditorView` komponens helyett egy szép skeleton loadert jelenítünk meg.

## Változtatások

### 1. useEditorData hook bővítése
**Fájl:** `src/hooks/useEditorData.ts`

- Új state: `isLoadingBlocks: boolean`
- A `fetchBlocks` függvény elején: `setIsLoadingBlocks(true)`
- A `fetchBlocks` végén (finally): `setIsLoadingBlocks(false)`
- A `setActiveChapterId` wrapperben: azonnal `setIsLoadingBlocks(true)` és blokkok ürítése

```typescript
const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);

// Custom setActiveChapterId wrapper
const handleSetActiveChapterId = useCallback((chapterId: string | null) => {
  if (chapterId !== activeChapterId) {
    setIsLoadingBlocks(true);
    setBlocks([]); // Azonnal ürítjük az előző fejezet blokkjait
  }
  setActiveChapterId(chapterId);
}, [activeChapterId]);

// fetchBlocks-ban:
const fetchBlocks = useCallback(async () => {
  if (!activeChapterId) return;
  
  setIsLoadingBlocks(true);
  try {
    // ... meglévő logika
  } finally {
    setIsLoadingBlocks(false);
  }
}, [activeChapterId]);
```

Return-ben: `isLoadingBlocks` és a wrappelt `setActiveChapterId` függvény

### 2. ProjectEditor frissítése
**Fájl:** `src/pages/ProjectEditor.tsx`

- Fogadja az `isLoadingBlocks` értéket a hookból
- Átadja az `EditorView`-nak

```typescript
const {
  // ... meglévő
  isLoadingBlocks,
} = useEditorData(projectId || "");

// EditorView-nak átadás:
<EditorView
  isLoading={isLoadingBlocks}
  // ... többi prop
/>
```

### 3. EditorView loading skeleton
**Fájl:** `src/components/editor/EditorView.tsx`

- Új prop: `isLoading?: boolean`
- Ha `isLoading === true`, akkor skeleton megjelenítése a blokkok helyett

```typescript
interface EditorViewProps {
  isLoading?: boolean;
  // ... többi prop
}

export function EditorView({
  isLoading,
  blocks,
  // ...
}: EditorViewProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[700px] px-16 py-8">
          <ContentSkeleton variant="editor" count={1} />
        </div>
      </div>
    );
  }

  return (
    // ... meglévő render
  );
}
```

## Vizuális eredmény

Fejezet váltásnál:
1. Kattintás a fejezetre
2. **Azonnal** megjelenik a skeleton loader (paragrafus vonalak animációval)
3. Blokkok betöltése után megjelenik az új fejezet tartalma

## Fájlok listája
1. `src/hooks/useEditorData.ts` - isLoadingBlocks state + wrapper
2. `src/pages/ProjectEditor.tsx` - prop átadás
3. `src/components/editor/EditorView.tsx` - skeleton megjelenítés
