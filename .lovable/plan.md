

## Képgenerálási Modell Váltás

### Cél
Átállítás a `google/gemini-3-pro-image-preview` modellről a `google/gemini-2.5-flash-image` modellre a gyorsabb és olcsóbb képgenerálás érdekében.

### Előnyök
- **Gyorsabb generálás**: ~2-3x gyorsabb válaszidő
- **Alacsonyabb költség**: Olcsóbb token árazás
- **Kevesebb timeout**: A gyorsabb válasz miatt kevesebb esély a kapcsolat megszakadására

### Hátrányok
- **Kissé alacsonyabb minőség**: A Flash modell kevésbé részletes képeket generálhat a Pro modellhez képest
- Egyszerűbb kompozíciók esetén a különbség minimális

### Szükséges változtatás

**Fájl:** `supabase/functions/generate-storybook-illustration/index.ts`

Egyetlen sor módosítása a 235. sorban:

```typescript
// Jelenlegi (drágább, lassabb):
model: "google/gemini-3-pro-image-preview",

// Új (olcsóbb, gyorsabb):
model: "google/gemini-2.5-flash-image",
```

### API Kulcs
**Nincs szükség új API kulcsra!** A `LOVABLE_API_KEY` már be van állítva és mindkét modellt támogatja.

### Érintett fájl
- `supabase/functions/generate-storybook-illustration/index.ts` - 1 sor módosítása

