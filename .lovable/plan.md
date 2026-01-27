
# Dashboard és Pricing Módosítások

## Összefoglalás

A felhasználó három módosítást kér:

1. **Folyamatban lévő írások szekció** - Csak könyvek jelenjenek meg (mesekönyvek ne), és csak azok, amiket épp a háttérben ír az AI
2. **Mesekönyveim megnyitása** - A mesekönyv készítő wizard utolsó (előnézet) lépésére vigyen, ahol lapozhatja és megnézheti
3. **Pricing módosítások**:
   - "ÍRÓ" csomag átnevezése → "PROFI"
   - PROFI: 250.000 szó/hó (korábban 1.000.000)
   - PROFI: 5 mesekönyv/hó (korábban 3)
   - HOBBI: 1 mesekönyv/hó (korábban 1 - ez marad)

---

## 1. Folyamatban Lévő Írások Szűrés

### Jelenlegi állapot
```typescript
const activeWritingProjects = useMemo(() => {
  return projects.filter(p => 
    p.writing_status && 
    !['idle', 'completed', 'failed'].includes(p.writing_status)
  );
}, [projects]);
```

### Új logika
A mesekönyvek kizárása és a háttérírás ellenőrzése:
```typescript
const activeWritingProjects = useMemo(() => {
  return projects.filter(p => 
    // Csak könyvek (nem mesekönyv)
    p.genre !== "mesekonyv" &&
    // Aktív háttérírás státusz
    p.writing_status && 
    ['queued', 'generating_outlines', 'writing', 'in_progress'].includes(p.writing_status) &&
    // Háttérírás mód
    p.writing_mode === "background"
  );
}, [projects]);
```

**Fájl:** `src/pages/Dashboard.tsx`

---

## 2. Mesekönyv Megnyitása - Wizard Utolsó Lépésre

### Jelenlegi állapot
Kész mesekönyv → `/storybook/:id` (StorybookViewer)

### Új logika
Mesekönyv megnyitása → `/create-storybook` a wizard 7. lépésére (előnézet), a projekt adataival betöltve

### Megvalósítás

**A) handleLoadingComplete módosítása (`Dashboard.tsx`):**
```typescript
const handleLoadingComplete = () => {
  if (loadingProjectId && loadingProject) {
    // Mesekönyv → wizard utolsó lépése (előnézet)
    if (loadingProject.genre === "mesekonyv") {
      navigate(`/create-storybook?projectId=${loadingProjectId}`);
    } else {
      navigate(`/project/${loadingProjectId}`);
    }
    setLoadingProjectId(null);
  }
};
```

**B) useStorybookWizard.ts módosítás:**
- URL query param ellenőrzése: `projectId`
- Ha van projectId, akkor betölti a meglévő projektet az adatbázisból
- Automatikusan a 7. lépésre (preview) ugrik

```typescript
// useStorybookWizard.ts - useEffect hozzáadása
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const projectIdParam = urlParams.get("projectId");
  
  if (projectIdParam && user) {
    // Meglévő projekt betöltése
    loadExistingProject(projectIdParam);
  }
}, [user]);

const loadExistingProject = async (projectId: string) => {
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
    
  if (project?.storybook_data) {
    const storybookData = JSON.parse(project.storybook_data);
    setData({
      ...storybookData,
      projectId: project.id,
      title: project.title,
    });
    setCurrentStep(7); // Preview lépés
  }
};
```

**Fájlok:**
- `src/pages/Dashboard.tsx`
- `src/hooks/useStorybookWizard.ts`

---

## 3. Pricing Módosítások

### Változtatások

| Csomag | Korábbi név | Új név | Szavak | Mesekönyv |
|--------|-------------|--------|--------|-----------|
| hobby | HOBBI | HOBBI | 100.000 | 1/hó |
| writer | ÍRÓ | PROFI | 250.000 | 5/hó |

### Kód módosítás (`src/types/subscription.ts`)

```typescript
{
  id: "writer",
  name: "PROFI",  // ÍRÓ → PROFI
  description: "Profi szerzőknek",  // Komoly íróknak → Profi szerzőknek
  // ...árak maradnak...
  features: [
    "50 aktív projekt",
    "250.000 szó / hó AI generálás",  // 1.000.000 → 250.000
    "5 mesekönyv / hó",  // ÚJ feature sor
    "Exportálás (DOC, Epub, PDF, TXT)",
    "Nano Banana Könyvborító tervező",
    "Kreatív regényíró AI rendszer",
    "Karakter & kutatás modul",
    "Minden műfaj (+18 tartalom)",
    "Email támogatás",
  ],
  monthlyWordLimit: 250000,  // 1000000 → 250000
  isPopular: true,
},
```

### HOBBI csomag feature lista frissítés

```typescript
{
  id: "hobby",
  name: "HOBBI",
  // ...
  features: [
    "5 aktív projekt",
    "100.000 szó / hó AI generálás",
    "1 mesekönyv / hó",  // ÚJ feature sor
    "Exportálás (DOC, Epub, PDF, TXT)",
    "Nano Banana Könyvborító tervező",
    "Kreatív regényíró AI rendszer",
    "Email támogatás",
  ],
  // ...
},
```

**Fájl:** `src/types/subscription.ts`

---

## Összegzés - Érintett Fájlok

| Fájl | Módosítás |
|------|-----------|
| `src/pages/Dashboard.tsx` | activeWritingProjects szűrő + mesekönyv navigáció |
| `src/hooks/useStorybookWizard.ts` | Meglévő projekt betöltése URL-ből |
| `src/types/subscription.ts` | ÍRÓ → PROFI átnevezés, szó limit, mesekönyv limit features |

---

## Megjegyzés: Adatbázis Szinkron

A subscription tierek database-oldali limitjei (pl. `storybook_credit_limit`) a `stripe-webhook` és `admin-update-subscription` edge functionökben vannak beállítva. Ha a tényleges 5 mesekönyv/hó limitet is be szeretnéd állítani, az adatbázis szintű változtatást is igényelne - de ez most csak a frontend feature listát módosítja.
