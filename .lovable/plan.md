

# Terv: Könyvlista Egyesítése Lapozóval és Rendezéssel

## Összefoglaló

A "Legutóbbi könyveim" szekciót átalakítjuk:
- **12 könyv** megjelenítése oldalanként (6 helyett)
- **Lapozó (pagination)** hozzáadása
- **Rendezési opciók** (legutóbbi, név A-Z/Z-A, szószám)
- **Mesekönyvek és könyvek együtt** egy listában (külön blokk megszüntetése)

---

## 1. Változtatások Áttekintése

### Jelenlegi állapot:
```text
┌─────────────────────────────────────────────┐
│ Legutóbbi könyveim (max 6 könyv)            │
│ [Könyv grid - 3x2]                          │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Mesekönyveim (max 6 mesekönyv)              │  ← MEGSZŰNIK
│ [Mesekönyv grid - 3x2]                      │
└─────────────────────────────────────────────┘
```

### Új állapot:
```text
┌───────────────────────────────────────────────────────────┐
│ Könyveim                        [Rendezés: Legutóbbi ▼]   │
├───────────────────────────────────────────────────────────┤
│ [Könyv + Mesekönyv grid - 3x4 = 12 kártya]                │
│                                                           │
│                                                           │
│                                                           │
├───────────────────────────────────────────────────────────┤
│              [← Előző]  1  2  3  [Következő →]            │
└───────────────────────────────────────────────────────────┘
```

---

## 2. Új State Változók

A Dashboard komponensben:

```typescript
// Lapozás
const [currentPage, setCurrentPage] = useState(1);
const ITEMS_PER_PAGE = 12;

// Rendezés
type SortOption = "recent" | "name_asc" | "name_desc" | "words_desc" | "words_asc";
const [sortBy, setSortBy] = useState<SortOption>("recent");
```

---

## 3. Egyesített és Rendezett Projektek

A jelenlegi `bookProjects` és `storybookProjects` helyett egy egyesített lista:

```typescript
// Összes könyv (könyv + mesekönyv együtt), nem archivált
const allBooks = useMemo(() => {
  let sorted = [...cardProjects];
  
  switch (sortBy) {
    case "recent":
      sorted.sort((a, b) => b.lastEditedAt.getTime() - a.lastEditedAt.getTime());
      break;
    case "name_asc":
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'hu'));
      break;
    case "name_desc":
      sorted.sort((a, b) => b.title.localeCompare(a.title, 'hu'));
      break;
    case "words_desc":
      sorted.sort((a, b) => b.wordCount - a.wordCount);
      break;
    case "words_asc":
      sorted.sort((a, b) => a.wordCount - b.wordCount);
      break;
  }
  
  return sorted;
}, [cardProjects, sortBy]);

// Lapozott projektek
const paginatedBooks = useMemo(() => {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  return allBooks.slice(start, start + ITEMS_PER_PAGE);
}, [allBooks, currentPage]);

// Összesen hány oldal
const totalPages = Math.ceil(allBooks.length / ITEMS_PER_PAGE);
```

---

## 4. Rendezés UI

Select komponens a szekció címsorában:

```text
┌─────────────────────────────────────────────────────────────┐
│ Könyveim                              Rendezés: [Legutóbbi ▼]
│                                                             │
│  Opciók:                                                    │
│  • Legutóbbi (alapértelmezett)                              │
│  • Név A-Z                                                  │
│  • Név Z-A                                                  │
│  • Szószám (csökkenő)                                       │
│  • Szószám (növekvő)                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Lapozás UI

A kártya grid alatt:

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              [← Előző]  1  2  3  ...  5  [Következő →]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Megjegyzés**: Ha 12 vagy kevesebb könyv van, a lapozó nem jelenik meg.

---

## 6. Mobil Nézet

Mobil nézeten ugyanúgy:
- Egyesített könyv lista (könyv + mesekönyv)
- Rendezés dropdown a cím mellé
- Lapozás alul
- Oldalanként 12 elem (vagy kevesebb mobilon? - marad 12)

---

## 7. Eltávolítandó Kód

A Dashboard.tsx-ből:

| Törlendő | Leírás |
|----------|--------|
| `storybookProjects` useMemo | Külön mesekönyv szűrés |
| `recentBooks` useMemo | Max 6 könyv limit |
| `recentStorybooks` useMemo | Max 6 mesekönyv limit |
| "Mesekönyveim" szekció | Desktop és mobil nézet JSX |

---

## 8. Szekció Cím Változás

| Jelenlegi | Új |
|-----------|-----|
| "Legutóbbi könyveim" | "Könyveim" |
| "Mesekönyveim" | *(megszűnik)* |

---

## 9. Érintett Fájl

| Fájl | Változtatás |
|------|-------------|
| `src/pages/Dashboard.tsx` | State, useMemo, JSX módosítások |

---

## 10. Implementációs Részletek

### 10.1 Import kiegészítés
```typescript
import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
```

### 10.2 Rendezés reset lapváltáskor
Amikor a rendezés változik, az aktuális oldal visszaáll 1-re:
```typescript
const handleSortChange = (value: SortOption) => {
  setSortBy(value);
  setCurrentPage(1);
};
```

### 10.3 Lapozó komponens
Magyar nyelvű "Előző" / "Következő" gombokkal.

---

## 11. Előnyök

| Előny | Leírás |
|-------|--------|
| Egyszerűbb UI | Nincs két külön szekció |
| Több könyv látható | 12 vs. korábbi 6 |
| Kereshetőség | Rendezéssel könnyen megtalálható |
| Skálázható | Bármennyi könyvnél működik |

