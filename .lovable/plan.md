

# Fix: Oknyomozó könyvtípus kontextus elvesztése az ötletgenerálásnál

## Probléma
A `nonfictionBookType` (pl. "investigative") és a `bookTypeSpecificData` nem kerül átadásra a `Step4StoryIdeas` komponensnek, és a `generate-story-ideas` edge function sem kapja meg. Így az AI csak az alkategóriát (pl. "Politika") látja, de nem tudja, hogy oknyomozó könyvet kell generálnia — ezért generál sima marketing könyvet.

## Javítás (3 fájl)

### 1. `src/components/wizard/steps/Step4StoryIdeas.tsx`
- Új prop: `nonfictionBookType?: NonfictionBookType | null`
- Új prop: `bookTypeSpecificData?: BookTypeSpecificData | null`
- Mindkettőt továbbítja a `generate-story-ideas` edge function hívásba

### 2. `src/components/wizard/BookCreationWizard.tsx`
- A nonfiction flow Step 6-ban átadja a `nonfictionBookType={data.nonfictionBookType}` és `bookTypeSpecificData={data.bookTypeSpecificData}` propokat a `Step4StoryIdeas`-nak

### 3. `supabase/functions/generate-story-ideas/index.ts`
- Kiszedi a `nonfictionBookType` és `bookTypeSpecificData` mezőket a request body-ból
- Ha `nonfictionBookType` megvan, beépíti a promptba: pl. "Könyv típusa: Oknyomozó tényfeltáró könyv" + a specifikus adatokat (vizsgált alany, bizonyítékok típusa stb.)
- Az oknyomozó típusnál az ötletek struktúráját is módosítja: "mainElements" → nyomozási szálak, "uniqueSellingPoint" → milyen leleplezést ígér

Így az AI pontosan tudni fogja, hogy oknyomozó könyvet kell generálnia, és a megfelelő stílusú ötleteket adja.

