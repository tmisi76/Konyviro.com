
# Mesekönyv Megjelenítés és Státusz Javítás

## Áttekintés

A fejlesztés három fő problémát old meg:
1. A kész mesekönyvek "Vázlat" helyett "Kész" státusszal jelenjenek meg
2. Kész mesekönyv megnyitásakor a mesekönyv megjelenítő (FlipBook) nyíljon meg
3. Normál könyvek megnyitásakor a könyv szerkesztő nyíljon meg

---

## Technikai Megoldás

### 1. Mesekönyv Készként Jelölése

**Fájl:** `src/hooks/useStorybookWizard.ts`

A `saveProject` funkció módosítása:
- Ellenőrizni, hogy minden oldal rendelkezik-e illusztrációval
- Ha igen, a `writing_status`-t `"completed"`-re állítani `"draft"` helyett

```typescript
// Jelenlegi
writing_status: "draft"

// Új logika
const allIllustrationsComplete = data.pages.length > 0 && 
  data.pages.every(p => p.illustrationUrl);
writing_status: allIllustrationsComplete ? "completed" : "draft"
```

### 2. Új Storybook Viewer Oldal

**Új fájl:** `src/pages/StorybookViewer.tsx`

Ez az oldal:
- Betölti a mesekönyv adatait az adatbázisból (`storybook_data` JSONB)
- Megjeleníti a `FlipBook` komponenssel
- Biztosít visszalépési lehetőséget a dashboardra
- Tartalmaz exportálási és szerkesztési gombot

**Komponensek:**
- Fejléc: Vissza gomb, cím, műveletek (Szerkesztés, Exportálás)
- FlipBook megjelenítő
- Opcionális export modal

### 3. Új Útvonal Regisztrálása

**Fájl:** `src/App.tsx`

Új route hozzáadása:
```typescript
<Route
  path="/storybook/:id"
  element={
    <ProtectedRoute>
      <Suspense fallback={<FullPageLoader message="Mesekönyv betöltése..." />}>
        <StorybookViewer />
      </Suspense>
    </ProtectedRoute>
  }
/>
```

### 4. Dashboard Navigáció Módosítása

**Fájl:** `src/pages/Dashboard.tsx`

A `handleLoadingComplete` funkció módosítása genre alapján:
- Ha a projekt `genre === "mesekonyv"` és `writing_status === "completed"` → `/storybook/${id}`
- Egyébként → `/project/${id}` (normál szerkesztő)

Ehhez szükséges:
- A `cardProjects` tartalmazza a `genre` és `writingStatus` mezőket (már tartalmazza)
- Új segédfüggvény a megfelelő útvonal kiválasztásához

```typescript
const handleLoadingComplete = () => {
  if (loadingProjectId && loadingProject) {
    const isCompletedStorybook = 
      loadingProject.genre === "mesekonyv" && 
      loadingProject.writing_status === "completed";
    
    if (isCompletedStorybook) {
      navigate(`/storybook/${loadingProjectId}`);
    } else {
      navigate(`/project/${loadingProjectId}`);
    }
    setLoadingProjectId(null);
  }
};
```

### 5. ProjectCard Frissítése

**Fájl:** `src/components/dashboard/ProjectCard.tsx`

A mesekönyvek esetén:
- Ha `genre === "mesekonyv"` és `writingStatus === "completed"` → "Kész" badge megjelenítése
- A "Vázlat" badge csak akkor jelenjen meg, ha tényleg `writingStatus === "draft"`

---

## Új Fájlok

| Fájl | Leírás |
|------|--------|
| `src/pages/StorybookViewer.tsx` | Kész mesekönyv olvasó nézet |

## Módosítandó Fájlok

| Fájl | Módosítás |
|------|-----------|
| `src/hooks/useStorybookWizard.ts` | `saveProject` - státusz beállítása késznek |
| `src/App.tsx` | Új `/storybook/:id` route |
| `src/pages/Dashboard.tsx` | Navigáció logika genre/státusz alapján |

---

## Felhasználói Élmény

### Kész Mesekönyv Megnyitása
```text
Dashboard → Mesekönyv kártya (Kész badge) → Kattintás
   ↓
Betöltő képernyő
   ↓
/storybook/:id → FlipBook nézetben megnyílik
```

### Folyamatban Lévő Mesekönyv Megnyitása
```text
Dashboard → Mesekönyv kártya (Vázlat badge) → Kattintás
   ↓
/create-storybook → Wizard folytatódik (ha van mentett adat)
   VAGY
/project/:id → Szerkesztő (alap projektnézet)
```

### Normál Könyv Megnyitása
```text
Dashboard → Könyv kártya → Kattintás
   ↓
/project/:id → Normál könyv szerkesztő
```

---

## StorybookViewer Komponens Struktúra

```text
┌─────────────────────────────────────────────────────────────┐
│  ← Vissza              [Mesekönyv címe]      [Szerkesztés] │
│                                              [Exportálás]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                   ┌───────────────────┐                     │
│                   │                   │                     │
│                   │     FlipBook      │                     │
│                   │                   │                     │
│                   │    (interaktív    │                     │
│                   │     könyv)        │                     │
│                   │                   │                     │
│                   └───────────────────┘                     │
│                                                             │
│                    [ < ]   • • • • •   [ > ]                │
│                           1/12 oldal                        │
└─────────────────────────────────────────────────────────────┘
```
