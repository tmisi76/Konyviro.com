
## Dashboard Hiba Javítás

### Hiba Azonosítás

A dashboard összeomlásának oka a `WritingStatusCard.tsx` fájlban található. A hiba akkor jelentkezik, amikor a `writing_status` mező értéke `"draft"`, ami nem szerepel a `statusConfig` objektumban.

**Hiba folyamata:**
1. Az adatbázis visszaad egy projektet `writing_status: "draft"` értékkel
2. A Dashboard `activeWritingProjects` szűrője beengedi (mert nem `idle`, `completed` vagy `failed`)
3. A `WritingStatusCard` megpróbálja keresni: `statusConfig["draft"]` → `undefined`
4. Majd `undefined.color` → **TypeError: Cannot read properties of undefined**

---

### Javítási Terv

#### 1. lépés - StatusConfig bővítése

Hozzá kell adni a `"draft"` státuszt a `statusConfig` objektumhoz a `WritingStatusCard.tsx` fájlban:

```typescript
const statusConfig: Record<WritingStatus, { label: string; color: string; icon: ReactNode }> = {
  idle: { label: "Nem indult", color: "bg-muted", icon: <Clock className="h-3 w-3" /> },
  draft: { label: "Vázlat", color: "bg-slate-500", icon: <FileText className="h-3 w-3" /> },  // ÚJ
  queued: { label: "Sorban áll", color: "bg-yellow-500", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  // ... többi meglévő
};
```

#### 2. lépés - WritingStatus típus frissítése

A `useBackgroundWriter.ts` hook-ban frissíteni kell a `WritingStatus` típust, hogy tartalmazza a `"draft"` értéket:

```typescript
export type WritingStatus = 
  | 'idle' 
  | 'draft'       // ÚJ
  | 'queued' 
  | 'generating_outlines' 
  | 'writing' 
  | 'in_progress'
  | 'paused' 
  | 'completed' 
  | 'failed';
```

#### 3. lépés - Fallback védelem hozzáadása

Biztonsági fallback logika a `WritingStatusCard.tsx`-ben arra az esetre, ha a jövőben más ismeretlen státusz érkezne:

```typescript
const status = statusConfig[progress.status] || statusConfig.idle;
```

---

### Érintett Fájlok

| Fájl | Módosítás |
|------|-----------|
| `src/hooks/useBackgroundWriter.ts` | `WritingStatus` típushoz `draft` hozzáadása |
| `src/components/dashboard/WritingStatusCard.tsx` | `statusConfig`-hoz `draft` hozzáadása + fallback védelem |

---

### Alternatív Megközelítés

Ha a `draft` státuszú projektek nem kellene, hogy megjelenjenek a "Folyamatban lévő írások" szekcióban, akkor a Dashboard szűrőjét is módosítani lehetne:

```typescript
const activeWritingProjects = useMemo(() => {
  return projects.filter(p => 
    p.writing_status && 
    !['idle', 'draft', 'completed', 'failed'].includes(p.writing_status)  // draft kizárva
  );
}, [projects]);
```

Ez a megoldás egyszerűbb, de nem kezeli az esetleges jövőbeli ismeretlen státuszokat.

**Javasolt megoldás:** Mindkét javítás kombinálása - a `draft` státusz hozzáadása a config-hoz ÉS a fallback védelem implementálása.
