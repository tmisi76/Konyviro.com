

# Fix: Szünet gomb után eltűnik a WritingStatusCard

## Probléma
A Dashboard-on az `activeWritingProjects` szűrő csak ezeket a státuszokat engedi át:
`['queued', 'generating_outlines', 'writing', 'in_progress']`

A `'paused'` nincs benne, így szüneteltetés után a kártya eltűnik és a projekt visszakerül a sima könyvek közé — nem látszik a "Folytatás" gomb.

## Javítás

### `src/pages/Dashboard.tsx` (~125. sor)
A szűrőbe bevenni a `'paused'` és `'incomplete'` státuszokat is:
```typescript
['queued', 'generating_outlines', 'writing', 'in_progress', 'paused', 'incomplete']
```

Egyetlen sor módosítás, egyetlen fájl.

