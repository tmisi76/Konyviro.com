
# Folyamatban Lévő Írások Blokk Javítás

## Probléma

Az adatbázis lekérdezés megmutatja, hogy a frissen létrehozott szakkönyv:
- `writing_status`: `in_progress` ✅
- `writing_mode`: **NULL** ❌

A jelenlegi szűrő feltétele `p.writing_mode === "background"`, de a projektnél a `writing_mode` NULL, ezért nem jelenik meg a blokkban.

---

## Megoldás

Távolítsuk el a `writing_mode === "background"` feltételt a szűrésből. Ehelyett elég csak az aktív írási státuszt ellenőrizni.

---

## Kód Módosítás

### Fájl: `src/pages/Dashboard.tsx`

**99-110. sorok - jelenlegi:**
```typescript
const activeWritingProjects = useMemo(() => {
  return projects.filter(p => 
    p.genre !== "mesekonyv" &&
    p.writing_status && 
    ['queued', 'generating_outlines', 'writing', 'in_progress'].includes(p.writing_status) &&
    p.writing_mode === "background"  // <-- EZ A PROBLÉMA
  );
}, [projects]);
```

**Új verzió:**
```typescript
const activeWritingProjects = useMemo(() => {
  return projects.filter(p => 
    // Csak könyvek (nem mesekönyv)
    p.genre !== "mesekonyv" &&
    // Aktív háttérírás státusz (nem kész és nem failed)
    p.writing_status && 
    ['queued', 'generating_outlines', 'writing', 'in_progress'].includes(p.writing_status)
    // writing_mode feltétel eltávolítva - elég a státusz
  );
}, [projects]);
```

---

## Összefoglalás

| Fájl | Módosítás |
|------|-----------|
| `src/pages/Dashboard.tsx` | `writing_mode === "background"` feltétel eltávolítása |

Ez után minden aktív írási státuszú könyv (nem mesekönyv) megjelenik a "Folyamatban lévő írások" blokkban.
