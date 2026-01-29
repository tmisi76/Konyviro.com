
# Implementációs Terv: Könyv Átnevezés + Hangoskönyv Kredit Láthatóság

## Problémák Összefoglalása

### 1. Könyv Átnevezés
A felhasználók nem tudják átnevezni a könyveiket. Hiányzik:
- Átnevezés funkció a `useProjects` hook-ból
- "Átnevezés" menüpont a projekt kártyákon és sidebar-ban
- Modal az új cím megadásához

### 2. Hangoskönyv Kredit Vásárlás
A hangoskönyv funkció és kredit vásárlás nem látható, mert:
- A Dashboard-on csak a sidebar compact `UsagePanel` jelenik meg
- Compact módban a hangoskönyv kredit csak akkor látszik, **ha már van egyenleg (>0)**
- A "Hangoskönyv kredit vásárlás" gomb csak a teljes `UsagePanel`-ben van, ami nem jelenik meg a Dashboard főoldalán

---

## Megoldások

### 1. Könyv Átnevezés Funkció

**Új komponens:**
```
src/components/projects/RenameProjectModal.tsx
```
- Egyszerű modal input mezővel
- Props: `open`, `onOpenChange`, `projectId`, `currentTitle`, `onSuccess`

**Hook bővítés: `useProjects.ts`**
- Új `renameProject(projectId: string, newTitle: string)` funkció

**UI integráció:**
- `ProjectCard.tsx` dropdown menü → "Átnevezés" opció hozzáadása
- `DashboardSidebar.tsx` projekt menü → "Átnevezés" opció hozzáadása

### 2. Hangoskönyv Kredit Láthatóság

**UsagePanel.tsx módosítás (compact mód):**
- Mindig mutassa a hangoskönyv kredit sort, **akkor is ha 0**
- Ha 0, mutassa: "0 perc" + "Vásárlás" ikon/link
- Kattintásra nyissa meg a `BuyAudiobookCreditModal`-t

**Dashboard.tsx módosítás:**
- A főoldalon (desktop) adjunk hozzá egy dedikált "Hangoskönyv kredit" kártyát/gombot
- Vagy: A `UsagePanel` teljes verzióját jelenítsük meg a desktop dashboardon is

---

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `src/hooks/useProjects.ts` | + `renameProject` funkció |
| `src/components/projects/RenameProjectModal.tsx` | **ÚJ** - átnevezés modal |
| `src/components/dashboard/ProjectCard.tsx` | + átnevezés menüpont + modal integráció |
| `src/components/dashboard/DashboardSidebar.tsx` | + átnevezés menüpont + callback |
| `src/components/dashboard/UsagePanel.tsx` | Compact mód: mindig mutassa hangoskönyv kreditet |
| `src/pages/Dashboard.tsx` | + Hangoskönyv kredit vásárlás gomb/kártya |

---

## Részletes Implementáció

### 1. RenameProjectModal.tsx

```tsx
interface RenameProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentTitle: string;
  onSuccess?: () => void;
}

// - Input mező az új címmel (előre kitöltve a jelenlegi címmel)
// - Validáció: min 1 karakter, max 100 karakter
// - Mentés gomb → updateProject API hívás
// - Toast üzenet sikeres mentés után
```

### 2. useProjects.ts - renameProject

```typescript
const renameProject = async (projectId: string, newTitle: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("projects")
      .update({ title: newTitle })
      .eq("id", projectId);

    if (error) throw error;

    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, title: newTitle } : p))
    );
    return true;
  } catch (err) {
    console.error("Error renaming project:", err);
    return false;
  }
};
```

### 3. ProjectCard Dropdown Bővítés

```tsx
// Új menüpont az "Exportálás" alatt:
<DropdownMenuItem onClick={() => setShowRenameModal(true)}>
  <Type className="mr-2 h-4 w-4" />
  Átnevezés
</DropdownMenuItem>

// + RenameProjectModal a komponens végén
```

### 4. UsagePanel Compact Mód Javítás

A 166-178. sor módosítása:

```tsx
{/* Audiobook credits in compact mode - ALWAYS show, even if 0 */}
{!audiobookLoading && (
  <button 
    onClick={() => setShowAudiobookCreditModal(true)}
    className="flex justify-between text-xs w-full hover:text-primary transition-colors"
  >
    <span className="flex items-center gap-1 text-primary">
      <Headphones className="h-3 w-3" />
      Hangoskönyv
    </span>
    <span className="text-primary font-medium flex items-center gap-1">
      {audiobookBalance > 0 ? formatAudioMinutes(audiobookBalance) : (
        <>
          <span>0 perc</span>
          <Plus className="h-3 w-3" />
        </>
      )}
    </span>
  </button>
)}
```

### 5. Dashboard Hangoskönyv Gomb (Opcionális)

A statscard-ok mellé egy új kártya vagy gomb:

```tsx
{/* Audiobook promo - csak ha nincs kredit */}
{audiobookBalance === 0 && (
  <div className="mb-8">
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Headphones className="h-8 w-8 text-primary" />
        <div>
          <h3 className="font-semibold">Készíts hangoskönyvet!</h3>
          <p className="text-sm text-muted-foreground">
            Változtasd át könyveidet professzionális hanganyaggá
          </p>
        </div>
      </div>
      <Button onClick={() => setShowAudiobookModal(true)}>
        Kredit vásárlás
      </Button>
    </div>
  </div>
)}
```

---

## Implementációs Sorrend

1. **RenameProjectModal.tsx** létrehozása
2. **useProjects.ts** bővítése `renameProject` funkcióval
3. **ProjectCard.tsx** - átnevezés menüpont + modal
4. **DashboardSidebar.tsx** - átnevezés menüpont + callback
5. **UsagePanel.tsx** - compact mód javítás (mindig mutassa hangoskönyv kreditet)
6. **Dashboard.tsx** - hangoskönyv promo kártya/gomb hozzáadása
