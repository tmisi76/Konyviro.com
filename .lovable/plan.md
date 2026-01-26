

# Mesekönyv képek nem jelennek meg - Closure probléma javítása

## Azonosított probléma

A backend sikeresen generálja és feltölti a képeket (a logok ezt mutatják), de a frontend **nem jeleníti meg** őket. A probléma oka egy **JavaScript closure** hiba.

### Technikai magyarázat

A `generateAllIllustrations` és `generateIllustration` függvényekben a `useCallback` closure a **régi state értékeket** rögzíti:

```typescript
// 296. sor - ez a sor a RÉGI data.pages-t látja
}, [user, data, updatePage]);

// 302. sor - ez is a régi értékeket szűri
const pagesToGenerate = data.pages.filter(p => !p.illustrationUrl);
```

Amikor az `updatePage` meghívódik:
1. A React state frissül (új `data.pages` létrejön)
2. DE a folyamatban lévő loop továbbra is a **régi** referenciát használja
3. A preview komponens megkapja az **új** state-et, de a régi pages-t a closure rögzítette

---

## Javítási terv

### 1. lépés: generateIllustration függvény javítása

A problémát úgy oldjuk meg, hogy a `generateIllustration` függvényben a page-et **közvetlenül paraméterként** kapjuk meg, nem a closure-ból olvassuk:

**Fájl:** `src/hooks/useStorybookWizard.ts`

```typescript
// Előtte:
const generateIllustration = useCallback(async (pageId: string): Promise<boolean> => {
  const page = data.pages.find(p => p.id === pageId);  // ❌ closure issue
  // ...
}, [user, data, updatePage]);

// Utána:
const generateIllustration = useCallback(async (
  pageId: string, 
  page: StorybookPage  // ✅ pass page directly
): Promise<boolean> => {
  // use page parameter instead of finding in data.pages
}, [user, data.illustrationStyle, data.characters, updatePage]);
```

### 2. lépés: generateAllIllustrations javítása

A `generateAllIllustrations`-t módosítjuk, hogy **állapotot használjon** a pages követésére:

**Fájl:** `src/hooks/useStorybookWizard.ts`

```typescript
// A legegyszerűbb megoldás: ref használata a friss pages eléréséhez
const pagesRef = useRef(data.pages);
useEffect(() => {
  pagesRef.current = data.pages;
}, [data.pages]);
```

VAGY a függvényben közvetlenül adjuk át a page objektumokat.

### 3. lépés: A pages lekérdezése a generálás után

Az `onComplete` hívás előtt meg kell győződnünk, hogy a legfrissebb `data.pages` értékeket használjuk.

---

## Részletes kódváltoztatások

### useStorybookWizard.ts módosítások

**1. Ref hozzáadása a pages követéséhez:**

A hook elején:
```typescript
const pagesRef = useRef<StorybookPage[]>([]);

// Sync ref with state
useEffect(() => {
  pagesRef.current = data.pages;
}, [data.pages]);
```

**2. generateIllustration módosítása:**

```typescript
const generateIllustration = useCallback(async (
  pageId: string,
  pageData?: StorybookPage // Optional: pass page data directly
): Promise<boolean> => {
  if (!user) {
    toast.error("Be kell jelentkezned");
    return false;
  }

  // Use passed page data or find from ref (not from closure)
  const page = pageData || pagesRef.current.find(p => p.id === pageId);
  if (!page) return false;

  updatePage(pageId, { isGenerating: true });

  try {
    const { data: response, error } = await supabase.functions.invoke("generate-storybook-illustration", {
      body: {
        prompt: page.illustrationPrompt,
        style: data.illustrationStyle,
        characters: data.characters,
        pageNumber: page.pageNumber,
      },
    });

    if (error) throw error;

    if (response.imageUrl) {
      updatePage(pageId, { 
        illustrationUrl: response.imageUrl,
        isGenerating: false,
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error generating illustration:", error);
    toast.error("Hiba az illusztráció generálása során");
    updatePage(pageId, { isGenerating: false });
    return false;
  }
}, [user, data.illustrationStyle, data.characters, updatePage]);
```

**3. generateAllIllustrations módosítása:**

```typescript
const generateAllIllustrations = useCallback(async (
  onProgress?: (current: number, total: number) => void
): Promise<boolean> => {
  // Get current pages from ref to avoid stale closure
  const currentPages = pagesRef.current;
  const pagesToGenerate = currentPages.filter(p => !p.illustrationUrl);
  const total = pagesToGenerate.length;
  
  for (let i = 0; i < pagesToGenerate.length; i++) {
    const page = pagesToGenerate[i];
    onProgress?.(i + 1, total);
    
    // Pass page data directly to avoid closure issues
    const success = await generateIllustration(page.id, page);
    if (!success) return false;
    
    // Small delay between generations to avoid rate limiting
    if (i < pagesToGenerate.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return true;
}, [generateIllustration]);
```

---

## Módosítandó fájlok összefoglalása

| Fájl | Változtatás |
|------|-------------|
| `src/hooks/useStorybookWizard.ts` | Ref hozzáadása, generateIllustration és generateAllIllustrations javítása |

---

## Várt eredmény

1. A képek generálása után az `illustrationUrl` helyesen frissül a state-ben
2. A preview komponens látja és megjeleníti a generált képeket
3. A mentés tartalmazza a helyes URL-eket
4. A thumbnail sávban is megjelennek a képek

