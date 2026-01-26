

# Terv: Loading Screen Módosítása

## Összefoglaló
A betöltési képernyőt módosítjuk:
- **1 üzenet** jelenik meg (nincs váltakozás)
- **4 másodperc** töltési idő (3 helyett)

## Változások

### Fájl: `src/components/loading/ProjectLoadingScreen.tsx`

| Beállítás | Régi érték | Új érték |
|-----------|------------|----------|
| `DURATION_MS` | 3000 | **4000** |
| Üzenet váltás | 600ms-onként | **Nincs** (egyetlen random üzenet) |

### Részletes Változások

1. **Időtartam növelése**:
   ```typescript
   const DURATION_MS = 4000; // 3000 → 4000
   ```

2. **Üzenet rotáció eltávolítása**:
   - Törlés: `MESSAGE_INTERVAL_MS` konstans
   - Törlés: `getRandomMessage` callback
   - Törlés: `messageInterval` setInterval
   - Megtartás: egyetlen random üzenet kiválasztása induláskor

### Egyszerűsített useEffect

```typescript
useEffect(() => {
  // Egyetlen random üzenet beállítása induláskor
  setCurrentMessage(FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]);

  // Progress animáció (4 másodperc alatt 0% → 100%)
  const progressInterval = setInterval(() => {
    setProgress((prev) => {
      const increment = 100 / (DURATION_MS / 50);
      return Math.min(prev + increment, 100);
    });
  }, 50);

  // Befejezés 4 másodperc után
  const completeTimeout = setTimeout(() => {
    setIsExiting(true);
    setTimeout(onComplete, 300);
  }, DURATION_MS);

  return () => {
    clearInterval(progressInterval);
    clearTimeout(completeTimeout);
  };
}, [onComplete]);
```

## Eredmény

```text
┌──────────────────────────────────────────────────┐
│                                                  │
│              [K] KönyvÍró                        │
│                                                  │
│     ████████████████████░░░░░░░░░░░░  52%        │
│                                                  │
│   "Kávét főzök a karaktereknek..."               │
│         (egyetlen üzenet, nem változik)          │
│                                                  │
└──────────────────────────────────────────────────┘
         4 másodperc után navigáció
```

