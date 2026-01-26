
# Javítási terv: Wizard → Dashboard átmenet szinkronizálása

## Probléma azonosítása

A felhasználó azt tapasztalja, hogy:
1. A wizard végén rákattint az "Automatikus írás indítása" gombra
2. Felvillan valami, majd átirányítás történik a Dashboard-ra
3. A Dashboard azt mutatja, hogy az írás NEM indult el, és újra felkínálja az indítást

**Gyökér ok**: Race condition - a navigate gyorsabb, mint az adatbázis frissítése.

```text
Idősor:
1. User kattint: "Automatikus írás indítása"
2. startWriting() → edge function hívás elindul
3. navigate("/dashboard") → AZONNAL átirányít (NEM várja meg az edge function-t!)
4. Dashboard betöltődik → fetchInitialState() lekéri a projektet
5. Projekt még "idle" státuszban (az edge function még fut)
6. Dashboard: "Indítás" gombot mutat → USER ÖSSZEZAVARODIK
7. Edge function végez → writing_status = 'generating_outlines'
8. Real-time subscription frissít → DE túl késő, a user már látta az "Indítás" gombot
```

## Megoldás

Két javítás szükséges:

### 1. `Step7AutoWrite.tsx` - Várjuk meg az edge function válaszát

A `handleStartWriting` function-ben:
- NE navigáljunk azonnal
- Várjuk meg, amíg a `startWriting()` befejezi a hívást
- Ellenőrizzük a sikert
- Csak EZUTÁN navigáljunk

```typescript
const handleStartWriting = async () => {
  try {
    await startWriting();
    // Kis várakozás, hogy a real-time subscription is frissülhessen
    await new Promise(resolve => setTimeout(resolve, 500));
    navigate("/dashboard");
  } catch (error) {
    // Ha hiba van, ne navigáljunk el - a toast már megjelenik a hook-ból
    console.error("Writing start failed:", error);
  }
};
```

### 2. `useBackgroundWriter.ts` - Optimista UI frissítés

A `startWriting()` function-ben az API hívás ELŐTT állítsuk be az állapotot:

```typescript
const startWriting = useCallback(async () => {
  if (!projectId) return;
  
  setIsLoading(true);
  
  // Optimista UI frissítés - azonnal mutassuk, hogy elindult
  setProgress(prev => ({
    ...prev,
    status: 'queued', // Azonnal "queued" státusz
    error: null,
    startedAt: new Date().toISOString(),
  }));
  
  try {
    const { data, error } = await supabase.functions.invoke('start-book-writing', {
      body: { projectId, action: 'start' }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    toast({ ... });
    
  } catch (error) {
    // Hiba esetén visszaállítjuk idle-re
    setProgress(prev => ({
      ...prev,
      status: 'idle',
      error: error instanceof Error ? error.message : "Ismeretlen hiba",
    }));
    
    toast({ variant: "destructive", ... });
  } finally {
    setIsLoading(false);
  }
}, [projectId, toast]);
```

### 3. Dashboard betöltési állapot javítása

Ha a projekt `writing_status` === `'queued'` vagy `'generating_outlines'`, de az `isLoading` még true, mutassunk egy loading indikátort a `WritingStatusCard`-on ahelyett, hogy az "Indítás" gombot mutatnánk.

## Összefoglaló táblázat

| Fájl | Változtatás |
|------|-------------|
| `src/components/wizard/steps/Step7AutoWrite.tsx` | Várakozás az edge function válaszára + delay |
| `src/hooks/useBackgroundWriter.ts` | Optimista UI frissítés a startWriting-ben |

## Javított flow

```text
Idősor (javítva):
1. User kattint: "Automatikus írás indítása"
2. Button loading állapotba kerül (Loader2 ikon)
3. startWriting() → optimista UI: status = 'queued'
4. Edge function hívás
5. Edge function válasz (1-2 sec)
6. 500ms várakozás (real-time sync)
7. navigate("/dashboard")
8. Dashboard betöltődik → projekt már 'generating_outlines' státuszban
9. WritingStatusCard: "Vázlatok készítése" badge → ✅ HELYES!
```

## Előnyök

- Nincs villanás vagy összeakadás
- A felhasználó mindig konzisztens állapotot lát
- Ha hiba van, a wizard-on marad és látja a hibaüzenetet
- Nincs lehetőség dupla indításra
