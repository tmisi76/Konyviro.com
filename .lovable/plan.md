

# Megosztási linkek mobiloptimalizálása

## Problémák
1. **Flipbook nézet**: A kétoldalas spread mobilon olvashatatlanul kicsi — `aspect-[2/1.4]` és `grid-cols-2` fix layout.
2. **Scroll nézet**: Túl nagy padding mobilon (`px-8 py-10`), a papír-metafora sok helyet pazarol.
3. **Nincs swipe-támogatás** — mobilon csak gombokkal lehet lapozni.
4. **Safe area** (notch) nincs kezelve.

## Javítások

### 1. `src/components/reader/BookFlipView.tsx`
- Mobilon **egyoldalas nézet** (1 oldal egyszerre), desktopon marad a spread (2 oldal).
- `useIsMobile()` hook használata a breakpoint figyeléshez.
- **Touch swipe** hozzáadása: `onTouchStart`/`onTouchEnd` események, 50px+ húzásnál lapozás.
- Mobilon: padding csökkentés (`p-4`), teljes magasságú oldal, nagyobb betűméret.
- Desktopon: marad a jelenlegi spread layout.

### 2. `src/pages/PublicBookReader.tsx`
- Scroll nézet mobilos finomítások:
  - Padding csökkentés: `px-4 py-6` mobilon vs `px-14 py-14` desktopon.
  - Fejezet-navigációs gombok: nagyobb touch target (min 44px).
  - Header: safe-area-top padding (`pt-safe`).
  - Footer: safe-area-bottom padding (`pb-safe`).
- Flipbook nézet header: ugyanúgy safe area.

### 3. Érintéssel lapozás (BookFlipView)
```text
Touch swipe logic:
  touchStart → record X position
  touchEnd → if deltaX > 50px → next page
              if deltaX < -50px → prev page
```

**Összesen 2 fájl módosítás**, a fő változás a BookFlipView mobilos single-page mód + swipe.

