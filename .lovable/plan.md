
## Cél / probléma összefoglalása
A lektorálás (akár fejezet-szintű, akár teljes könyves) a backendben **a `chapters.content` mezőt frissíti**, miközben a szerkesztő UI **a `blocks` táblából** rajzol. Emiatt előfordulhat, hogy:
- a lektorálás “kész”-nek látszik,
- a fejezet a backendben tényleg frissült,
- de a szerkesztőben mégis a régi blokkok maradnak láthatóak.

Ez különösen biztosan megtörténik a **teljes könyves** lektorálás után (ProofreadingTab), mert ott jelenleg nincs automatikus blokk-szinkron.

## Diagnózis (amit a kódban és adatokból látunk)
1. A szerkesztő “forrása” a `blocks`:
   - `ProjectEditor` → `EditorView` → `EditorBlock` a `blocks` state-et rendereli.
2. A lektorálás backend oldalon a `chapters`-t frissíti:
   - `process-proofreading` frissíti a `chapters.content`-et, **de nem nyúl a `blocks`-hoz**.
   - `proofread-chapter` frissíti a `chapters.content`-et, **de nem nyúl a `blocks`-hoz**.
3. A frontendben van ugyan “force refresh”:
   - `useEditorData.forceRefreshBlocks(chapterId)` törli és újraépíti a blokkokat `chapters.content`-ből.
   - De ezt most csak bizonyos UI útvonalak hívják (és a full-book flow után nincs garantált hívás).
4. A UI-nak kell egy “biztos” szabály, hogy mikor tekintse a `blocks`-ot elavultnak.

## Megoldási stratégia (robosztus, “nem tud elromlani” irány)
Két rétegű védelem:

### A) Frontend: automatikus blokkszinkron “elavultság” alapján (ajánlott fő fix)
A `useEditorData.fetchBlocks()` logikájába beépítünk egy ellenőrzést:

- Lekérjük:
  - `chapters.updated_at` (és szükség esetén `chapters.content`)
  - a meglévő `blocks` sorokat az adott fejezethez
- Megnézzük a `blocks` legfrissebb `updated_at` értékét (max).
- Ha **a fejezet frissítése újabb**, mint a blokkok frissítése (pl. > 1s különbséggel), akkor a blokkok **elavultak** → automatikus:
  - `forceRefreshBlocks(activeChapterId)` futtatása (törlés + újraépítés),
  - majd UI state frissítése.

Ezzel:
- ha a lektorálás a háttérben módosította a fejezetet (full-book),
- vagy valamiért a dialog refresh kimaradt,
- a szerkesztő legközelebbi betöltéskor/fejezetváltáskor magától helyreáll.

### B) Backend: biztosíték – blokkok törlése, amikor fejezetet felülírunk (másodlagos, de hasznos)
A `process-proofreading` és `proofread-chapter` végén, közvetlenül a `chapters` update után:
- töröljük a `blocks`-ot az adott fejezetre (`delete where chapter_id = ...`).

Ezzel:
- ha a user később nyitja meg a fejezetet,
- a frontend `fetchBlocks` már eleve “nincs blokk” ágon fog menni, és `chapters.content`-ből újra fogja generálni.

Megjegyzés: Ez csökkenti a “két forrásból eltérő állapot” esélyét és egyszerűsíti a konzisztenciát.

## Teljesítmény / UX javítás (a “gomb pár másodpercig nem kattintható” gondra)
A `forceRefreshBlocks` jelenleg bekezdésenként külön INSERT-et csinál (sok hálózati kérés).
Ezt optimalizáljuk:
- 1 db `delete` a fejezet blokkjaira,
- 1 db `select` a fejezet content+updated_at-ra,
- 1 db **batch insert** a bekezdésekből (egy tömbben),
- state frissítés.

Plusz:
- `forceRefreshBlocks` indulásakor: `setIsLoadingBlocks(true)` és `setBlocks([])` (UI tisztán újrarenderel),
- `finally`: `setIsLoadingBlocks(false)`.

Így a “Mentés / frissítés” rész gyorsabb, és kevesebb ideig van a UI “befagyva”.

## Érintett fájlok (tervezett módosítások)

### Frontend
1) `src/hooks/useEditorData.ts`
- `fetchBlocks()`:
  - plusz lekérdezés: `chapters.updated_at` (és tartalom ha kell)
  - összehasonlítás: `chapter.updated_at` vs `max(block.updated_at)`
  - ha elavult: `await forceRefreshBlocks(activeChapterId); return;`
- `forceRefreshBlocks(chapterId)`:
  - állapotjelzés: `setIsLoadingBlocks(true)`, `setBlocks([])`
  - batch insert logika (ne bekezdésenként)
  - `try/finally` blokk

2) (Opció) `src/pages/ProjectEditor.tsx`
- Ha szükséges: a “Szerkesztő” fülre váltáskor egy “soft refresh” (refetchChapters/refetchBlocks).
- Valószínűleg nem kell, ha A) kész, mert fejezetváltáskor eleve `fetchBlocks()` fut.

3) (Ha még kell extra biztosíték) `src/components/editor/ChapterSidebar.tsx`
- A dialog befejezés után megjeleníthetünk egy “Frissítés újra” gombot (csak ha user szerint nem látszik).
- Vagy a mostani flow-ban `try/finally` köré tesszük a refresh részt (nehogy `isRefreshing` bennragadjon).

### Backend funkciók
4) `supabase/functions/process-proofreading/index.ts`
- A fejezet update után: `delete from blocks where chapter_id = chapter.id`
- (Opcionálisan) logolás: hány blokk lett törölve

5) `supabase/functions/proofread-chapter/index.ts`
- A fejezet update után: `delete from blocks where chapter_id = chapterId`
- (Így ha valaki később nyitja meg, biztosan újragenerálódik)

## Teszt forgatókönyvek (end-to-end)
1) Fejezet-szintű lektor:
- Nyiss meg egy fejezetet → indíts “Fejezet lektorálása”.
- Várd meg a befejezést.
- Ellenőrizd, hogy a szerkesztőben **azonnal** a javított szöveg látszik (nem kell újratölteni az oldalt).

2) Teljes könyves lektor (ProofreadingTab):
- Indíts teljes lektorálást, várd meg a “Befejezve” állapotot.
- Menj vissza a Szerkesztő fülre.
- Válts fejezetet oda-vissza:
  - Az érintett fejezetekben a szövegnek a javított verzión kell megjelennie.

3) Megbízhatóság:
- Lektor után frissíts rá az oldalra (F5).
- Nyisd meg ugyanazt a fejezetet: a javított szövegnek kell maradnia.

## Kockázatok / mellékhatások
- A blokkok automatikus újragenerálása “külső frissítésnél” felülírja a régi blokk-struktúrát (ez jelenleg is a cél lektorálásnál).
- Batch insertnél figyelni kell a sorrendre (`sort_order`) és a `metadata` defaultokra.
- A `chapters.updated_at` és `blocks.updated_at` összehasonlításnál érdemes 1–2 másodperces toleranciát hagyni, hogy ne induljon feleslegesen refresh.

## Elfogadási kritérium
- “Lektorálás befejezve” után a szerkesztőben nem maradhat régi szöveg úgy, hogy a backendben már új van.
- Full-book lektor után a szerkesztőben a szöveg látszódjon extra kézi “frissítés” nélkül (minimum fejezetváltásra biztosan).
