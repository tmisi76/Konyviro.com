## Cél
Megszüntetem azt, hogy az app az ötlet/koncepció után magyar nevekre cserélje a felhasználó által megadott vagy kiválasztott karakterneveket. A név- és karakterinformáció végigmenjen ezen a láncon:

```text
ötlet → koncepció → fejezetvázlat → jelenetvázlat → tényleges könyvírás
```

## Mit javítok

1. **Karakternevek kinyerése és zárolása már a koncepciógenerálásnál**
   - A `generate-story` funkcióban felismerem a felhasználó által megadott karakterneveket a sztoriötletből/koncepcióból.
   - Ezeket „név-zárként” adom át az AI-nak: meglévő karaktert nem nevezhet át, nem magyarosíthat, nem cserélhet le.
   - Ha például a felhasználó azt írja, hogy „Géza a Galaktikus Szövetség kapitánya, kék bőrrel és csápokon lógó szemekkel”, akkor Géza nem válhat random magyar családnevű földi szereplővé, és a fizikai jellemzők is megmaradnak.

2. **A magyar névsorrend szabály finomítása**
   - A közös promptban jelenleg túl erős a „magyar névsorrend” utasítás, ami nem magyar vagy sci-fi/fantasy történetnél félreviheti a modellt.
   - Átírom úgy, hogy a magyar helyesírás és párbeszédformázás maradjon, de a névsorrend csak magyar karaktereknél legyen kötelező.
   - Nem magyar, fantasy vagy sci-fi névnél az eredeti névforma maradjon.

3. **Névtípus beállítás kiterjesztése sci-fi/fantasy irányba**
   - A már hozzáadott „Karakterek nemzetisége / nyelve” opciót pontosítom.
   - A „Fantasy / kitalált” mellé bevezetem vagy egyértelművé teszem a sci-fi/idegen név opciót is.
   - A promptban külön szabályt kapnak az idegen/fantasy nevek: lehetnek nem földi, kitalált nevek, de ha a user adott konkrét nevet, az elsőbbséget élvez.

4. **A koncepcióból érkező karakterek tényleges mentése és felhasználása**
   - Ellenőrzöm és javítom a wizard karaktermentési útját, hogy a generált/megadott karakterek tényleg bekerüljenek a `characters` táblába.
   - A karaktermentésnél javítom a hibás/torzított szerepértékeket is, hogy ne legyen gond a későbbi karakterlekérdezésnél.

5. **Fejezet- és jelenetvázlat karakterkényszerítése**
   - A `generate-chapter-outline` és `generate-section-outline` promptjába beépítem a karakterlistát és a név-zárat.
   - A fejezetvázlat ne találjon ki új főszereplőt, ha már van megadott/projektbe mentett karakter.
   - A jelenetvázlat `pov` és `characters_in_scene` mezői a meglévő neveket használják.

6. **Tényleges író motor karakterkonzisztencia erősítése**
   - A `write-section` / háttéríró motor már részben használ karakterzárat, de csak akkor működik jól, ha a karakterek ténylegesen el vannak mentve és a jelenetvázlatban ugyanazok a nevek szerepelnek.
   - Ezt végig összekötöm, hogy a generált prózában ne jelenjenek meg önkényesen magyarított vagy lecserélt nevek.

7. **Könyv Coach útvonal javítása is**
   - A Coach automata írási útja jelenleg nem kér névtípust, és alapból `ai_choose`-t használ.
   - A Coachból érkező konkrét szereplőneveket is beépítem a projekt koncepciójába és a név-zárba.
   - Ha a Coach összefoglalóban van helyszín/műfaj/sci-fi/fantasy jelzés, abból nem magyar nevek felé tereli a rendszert.

## AI verzió kérdésére
Az app már a Lovable AI-n keresztül működik, nem egy egyszerű sablonmotor. A gond itt nem feltétlenül az „AI butasága”, hanem az, hogy a promptlánc több pontján elveszik vagy gyengül a karakterkonteksztus. Ezt javítom most úgy, hogy ne csak az első 3 ötletnél, hanem a tényleges könyvírásnál is kötelezően érvényesüljön a megadott karakterlista.

## Érintett fájlok
- `supabase/functions/_shared/prompt-builder.ts`
- `supabase/functions/generate-story/index.ts`
- `supabase/functions/generate-chapter-outline/index.ts`
- `supabase/functions/generate-section-outline/index.ts`
- `supabase/functions/write-section/index.ts`
- `src/types/wizard.ts`
- `src/components/wizard/steps/Step3FictionStyle.tsx`
- `src/hooks/useBookWizard.ts`
- `src/hooks/useCoachToAutoWrite.ts`

## Ellenőrzési forgatókönyvek
1. Sci-fi ötlet konkrét szereplővel: „Géza, kék bőrű kapitány...” → a koncepció, fejezetvázlat és jelenetek is Gézát használják.
2. Angol/amerikai névtípus kiválasztása → John/Emily/Morgan jellegű nevek maradnak, nem lesz belőlük János/Anna/Kovács.
3. Fantasy/sci-fi névtípus → az AI generálhat idegen/fantasy neveket, de a user által megadott neveket nem írja át.
4. Coachból indított automata könyv → a Coachban megadott szereplők nem vesznek el az automata írásnál.