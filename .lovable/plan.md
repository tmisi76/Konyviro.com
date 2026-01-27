
# Szöveg Módosítás - Könyvírás Folyamatban Üzenet

## Összefoglalás

A könyvírás wizard utolsó lépésénél a háttérírás üzenetet és a gombot kell módosítani.

---

## Változtatások

### Fájl: `src/components/wizard/steps/Step7AutoWrite.tsx`

| Elem | Jelenlegi | Új |
|------|-----------|-----|
| **Üzenet szöveg** | "A könyved írása a háttérben fut. Bezárhatod ezt az oldalt, a folyamatot a Dashboard-on követheted nyomon." | "Most kérlek kattints a gombra, zárd be ezt az ablakot, utána kattints az INDÍTÁS gombra a könyvnél és az AI megírja a háttérben a könyvet." |
| **Gomb szöveg** | "Folyamat követése a Dashboard-on" | "Bezárom az ablakot és elindítom a szövegírást" |

---

## Kód Módosítás

**133-137. sor (üzenet):**
```tsx
{progress.status !== 'completed' && (
  <p className="text-center text-muted-foreground">
    Most kérlek kattints a gombra, zárd be ezt az ablakot, utána kattints 
    az INDÍTÁS gombra a könyvnél és az AI megírja a háttérben a könyvet.
  </p>
)}
```

**144-146. sor (gomb):**
```tsx
{progress.status === 'completed' 
  ? 'Vissza a Dashboard-ra' 
  : 'Bezárom az ablakot és elindítom a szövegírást'}
```

---

## Érintett Fájl

| Fájl | Módosítás |
|------|-----------|
| `src/components/wizard/steps/Step7AutoWrite.tsx` | Üzenet és gomb szöveg frissítése |
