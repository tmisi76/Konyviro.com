

# Javítás: Könyv Átnevezés - Lista Frissítés

## Probléma Azonosítása

A `ProjectCard` komponensben lévő `RenameProjectModal` nem kap `onSuccess` callback-et, így a sikeres átnevezés után:
1. Az adatbázisban frissül a cím
2. De a Dashboard listája nem frissül automatikusan
3. A felhasználónak manuálisan kell frissítenie az oldalt

A realtime subscription elméletileg működhetne, de a jelenlegi implementációban van egy kis késés, és a lokális állapot nem frissül azonnal.

## Megoldás

A `ProjectCard` komponenst módosítani kell, hogy átadja az `onSuccess` callback-et a `RenameProjectModal`-nak, ami a szülő komponenstől (`Dashboard`) kapott `refetch` függvényt hívja meg.

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `src/components/dashboard/ProjectCard.tsx` | + `onRename` prop hozzáadása, átadás a `RenameProjectModal`-nak |
| `src/pages/Dashboard.tsx` | + `onRename={refetch}` átadás a `ProjectCard`-nak |

## Technikai Részletek

### 1. ProjectCard.tsx Módosítás

```tsx
// Interface bővítés:
interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  onRename?: () => void; // ÚJ - callback az átnevezés utáni frissítéshez
}

// Props átvétele:
export function ProjectCard({ project, onOpen, onDelete, onArchive, onRename }: ProjectCardProps) {

// RenameProjectModal módosítása:
<RenameProjectModal
  open={showRenameModal}
  onOpenChange={setShowRenameModal}
  projectId={project.id}
  currentTitle={project.title}
  onSuccess={onRename}  // ÚJ - frissíti a listát
/>
```

### 2. Dashboard.tsx Módosítás

A `ProjectCard` komponenseknél átadni az `onRename` prop-ot:

```tsx
<ProjectCard
  key={project.id}
  project={project}
  onOpen={handleProjectOpen}
  onDelete={handleProjectDeleteRequest}
  onArchive={handleArchiveProject}
  onRename={refetch}  // ÚJ - lista újratöltése átnevezés után
/>
```

Mindkét helyen (desktop és mobil nézet).

## Implementációs Sorrend

1. `ProjectCard.tsx` - `onRename` prop hozzáadása az interface-hez és átadása a modal-nak
2. `Dashboard.tsx` - `onRename={refetch}` átadása minden `ProjectCard` komponensnek

