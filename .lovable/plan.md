
# Fejezet Lektorálás Szövegfrissítés Javítás

## Probléma Azonosítása

A lektorálás sikeresen lefut a backend oldalon (lásd logok: "Completed chapter ... 1263 words"), de a szerkesztőben nem frissül a szöveg.

**Gyökérok**: A `useEditorData` hook **saját React state-et** (`useState`) használ a chapters és blocks tárolására, **nem React Query**-t. Ezért a `queryClient.invalidateQueries(["chapters"])` hívás a `useChapterProofreading` hookból **hatástalan**.

```text
useChapterProofreading                     useEditorData
        │                                        │
        │ queryClient.invalidate()               │ useState(chapters)
        └──────────────X────────────────────────►│ useState(blocks)
                   (nincs kapcsolat!)            │
```

## Megoldás

Két lehetőség van:

**A) useEditorData bővítése refetch függvénnyel (Javasolt)**
- Exponáljuk a `fetchBlocks` és `fetchChapters` függvényeket
- A ChapterSidebar ezeket hívja meg lektorálás után

**B) Callback átadása a hooknak**
- A `useChapterProofreading` kap egy `onComplete` callbacket
- Ez manuálisan frissíti a szerkesztő state-ét

## Technikai Változtatások

### 1. useEditorData.ts Módosítás
- Exportálni a `fetchBlocks` és `fetchChapters` függvényeket a return objektumban

### 2. ProjectEditor.tsx Módosítás  
- Átadni a `fetchBlocks` és `fetchChapters` függvényeket a ChapterSidebar komponensnek

### 3. ChapterSidebar.tsx Módosítás
- Új props: `onRefreshChapter?: () => void`
- Lektorálás befejezése után meghívni a refresh funkciót
- A blokkokat is újra kell tölteni, nem csak a fejezetet

### 4. useChapterProofreading.ts Opcionális Javítás
- Az `onComplete` callback már létezik, de jelenleg nem használjuk ki
- Jobb elnevezés: `onContentUpdated`

## Fájl Változtatások

| Fájl | Változás |
|------|----------|
| `src/hooks/useEditorData.ts` | `fetchBlocks` és `fetchChapters` exportálása |
| `src/pages/ProjectEditor.tsx` | Refresh props átadása ChapterSidebar-nak |
| `src/components/editor/ChapterSidebar.tsx` | Refresh hívása lektorálás után |
| `src/hooks/useChapterProofreading.ts` | React Query invalidate eltávolítása (felesleges) |

## Implementáció Részletei

### useEditorData.ts
```typescript
return {
  // ... meglévő
  refetchChapters: fetchChapters,  // Új
  refetchBlocks: fetchBlocks,       // Új
};
```

### ProjectEditor.tsx
```tsx
<ChapterSidebar
  // ... meglévő props
  onRefreshChapter={async () => {
    await fetchChapters();
    await fetchBlocks();
  }}
/>
```

### ChapterSidebar.tsx
```tsx
interface ChapterSidebarProps {
  // ... meglévő
  onRefreshChapter?: () => Promise<void>;
}

// handleConfirmProofreading-ban:
const success = await proofreadChapter(...);
if (success) {
  await onRefreshChapter?.();
}
```

## Tesztelési Lépések

1. Nyiss meg egy projektet a szerkesztőben
2. Jobb klikk egy fejezeten -> "Fejezet lektorálása"
3. Várd meg a stream befejezését
4. Ellenőrizd: a fejezet szövege frissült-e a szerkesztőben
5. Ellenőrizd: a szószám badge frissült-e a sidebarban
