
# Dashboard Átszervezés - Mesekönyvek Elkülönítése

## Összefoglalás

A dashboard jelenlegi struktúráját át kell alakítani, hogy:
1. **Mesekönyvek külön szekcióban** jelenjenek meg
2. **Kész projektek "Kész" jelzéssel** legyenek megjelölve
3. **Címkézések magyarosítása** - "Új projekt" → "Új könyv készítés", "Legutóbbi projektek" → "Legutóbbi könyveim"

---

## Változások Áttekintése

### 1. Szekciók Átalakítása

**Jelenlegi struktúra:**
- Statisztikák
- Folyamatban lévő írások
- Legutóbbi projektek (minden típus egyben)

**Új struktúra:**
- Statisztikák
- Folyamatban lévő írások
- Legutóbbi könyveim (csak nem-mesekönyv projektek)
- Mesekönyveim (külön szekció a `mesekonyv` genre-ű projektekhez)

### 2. Címkék Módosítása

| Eredeti | Új |
|---------|-----|
| "Új projekt" | "Új könyv készítés" |
| "Legutóbbi projektek" | "Legutóbbi könyveim" |
| "Projektek" (üres állapot) | "Könyveim" |
| "Összes projekt" | "Összes könyv" |

### 3. Kész Projektek Jelzése

A `writing_status === "completed"` státuszú projektek "Kész" badge-et kapnak a kártyán, nem csak ha `writingMode === "background"`.

---

## Technikai Terv

### A) Dashboard.tsx Módosítások

#### Szűrők Hozzáadása
```typescript
// Mesekönyvek külön szűrése
const storybookProjects = useMemo(() => {
  return projects
    .filter((p) => p.genre === "mesekonyv" && p.status !== "archived")
    .map((p) => ({ /* formázás */ }));
}, [projects]);

// Normál könyvek (nem mesekönyv)
const bookProjects = useMemo(() => {
  return projects
    .filter((p) => p.genre !== "mesekonyv" && p.status !== "archived")
    .map((p) => ({ /* formázás */ }));
}, [projects]);
```

#### Szekciók Renderelése
```tsx
{/* Legutóbbi könyveim */}
<section>
  <h2>Legutóbbi könyveim</h2>
  {bookProjects.length === 0 ? <EmptyState /> : <ProjectCards />}
</section>

{/* Mesekönyveim - csak ha van */}
{storybookProjects.length > 0 && (
  <section>
    <h2>Mesekönyveim</h2>
    <StorybookCards />
  </section>
)}
```

### B) DashboardSidebar.tsx Módosítások

- **"Új projekt"** gomb szöveg → **"Új könyv készítés"**
- Limit elérve esetén: **"Limit elérve"** marad

### C) ProjectCard.tsx Módosítások

#### Kész Jelzés Logikája
```typescript
// Jelenlegi (túl szűk):
{isCompleted && project.writingMode === "background" && (...)}

// Új (minden kész projekt):
{isCompleted && (
  <Badge className="bg-green-600">
    <CheckCircle /> Kész
  </Badge>
)}
```

#### Mesekönyv Badge
```typescript
// Új genre config bejegyzés
mesekonyv: {
  label: "Mesekönyv",
  className: "bg-amber-100 text-amber-700 border-amber-200 ..."
}
```

### D) StatsCard Címke

- **"Összes projekt"** → **"Összes könyv"**

### E) MobileBottomNav.tsx

- **"Projektek"** tab → **"Könyveim"**

### F) EmptyState.tsx

- **"Hozd létre első könyved"** → **"Készítsd el első könyved"**

---

## Érintett Fájlok

| Fájl | Módosítás Típusa |
|------|------------------|
| `src/pages/Dashboard.tsx` | Szűrők, szekciók, címkék |
| `src/components/dashboard/DashboardSidebar.tsx` | Gomb szöveg |
| `src/components/dashboard/ProjectCard.tsx` | "Kész" badge, mesekönyv genre |
| `src/components/dashboard/StatsCard.tsx` | - (csak a hívás helyén) |
| `src/components/dashboard/EmptyState.tsx` | Szövegek |
| `src/components/mobile/MobileBottomNav.tsx` | Tab címke |

---

## UI Struktúra (Asztali Nézet)

```text
┌─────────────────────────────────────────────────────────────┐
│  Üdv újra, [Felhasználó]!                                   │
│  Folytasd az írást ott, ahol abbahagytad.                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Összes könyv│  │   Mai írás  │  │   Sorozat   │          │
│  │      4      │  │     0       │  │     0       │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Folyamatban lévő írások                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [Projekt kártya - írás alatt]                       │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Legutóbbi könyveim                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                │
│  │  Fiction  │  │ Erotikus  │  │ Szakkönyv │                │
│  │   ✓ Kész  │  │   ✓ Kész  │  │   ✓ Kész  │                │
│  └───────────┘  └───────────┘  └───────────┘                │
├─────────────────────────────────────────────────────────────┤
│  Mesekönyveim                                               │
│  ┌───────────┐                                              │
│  │ Mesekönyv │                                              │
│  │  🧸 Kész  │                                              │
│  └───────────┘                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Sidebar "Új könyv készítés" Gomb

```text
┌──────────────────────┐
│  + Új könyv készítés │  ← Módosított szöveg
└──────────────────────┘
```

Limit elérése esetén továbbra is "Limit elérve" szöveg marad.
