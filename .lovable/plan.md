
Cél: a megosztási linken a „Könyv (lapozós)” mód ténylegesen lapozós nézetet adjon, és a szöveg mindkét nézetben könyvszerűen tördelt legyen.

1) Gyökérok javítása: a nézetmód figyelmen kívül van hagyva
- Fájl: `src/pages/PublicBookReader.tsx`
- Javítás:
  - A renderelést két ágra bontom `data.share.view_mode` alapján:
    - `scroll` → jelenlegi ebook-scroll layout
    - `flipbook` → lapozós layout (`BookFlipView`)  
  - Defenzív fallback: ha `view_mode` hiányzik/érvénytelen, alapértelmezés `scroll`.

2) Lapozós nézet tényleges működése megosztási linken
- Fájl: `src/components/reader/BookFlipView.tsx`
- Javítás:
  - A komponens tényleges bekötése a public readerbe.
  - Tartalom-normalizálás, hogy HTML és plain text esetén is jól működjön:
    - HTML bekezdések (`<p>`, `<br>`) → olvasható bekezdéslista
    - plain text `\n\n` → bekezdések
  - Oldalakra tördelés stabilizálása (ne nyers HTML tageket lapozzon).
  - Navigáció finomítás:
    - előző/következő biztosan léptessen
    - fejezetváltáskor az első spreadre álljon
    - billentyűs lapozás maradjon.

3) Tördelés egységesítése (ne essen szét nézetenként)
- Fájlok:
  - `src/pages/PublicBookReader.tsx`
  - `src/components/reader/BookFlipView.tsx`
- Javítás:
  - Közös tartalom-előkészítési logika: bekezdésfelismerés + üres sorok takarítása.
  - Scroll nézetben marad az ebook tipográfia (sorkizárt, behúzás, olvasható sorköz).
  - Flipbook nézetben is bekezdésenkénti tördelés (ne egybefüggő blokk legyen).

4) Megosztási mód adatfolyam stabilizálása
- Fájlok:
  - `src/hooks/useBookShare.ts`
  - (szükség szerint) `src/components/reader/ShareBookModal.tsx`
- Javítás:
  - A publikus lekérésben a `view_mode` érték normalizálása (`flipbook|scroll`).
  - Hibás/null érték esetén biztos fallback, hogy ne legyen „némán rossz” viselkedés.
  - A mentett módot a reader minden megnyitáskor konzisztensen alkalmazza.

5) Validáció (end-to-end ellenőrzési terv)
- Forgatókönyv:
  1. Dashboard → Megosztás modal → „Könyv (lapozós)” + Mentés
  2. Megosztási link megnyitása
  3. Ellenőrzés:
     - lapozós UI jelenik meg (nem scroll nézet)
     - előző/következő működik
     - bekezdések tördeltek, olvashatók
     - másik könyvnél/fejezetnél is stabil
  4. Visszaállítás „Görgetős” módra és ellenőrzés, hogy ott is korrekt tördelés marad.

Technikai részletek (röviden)
- Nem backend/RLS probléma, hanem frontendes render-ág hiány: a `view_mode` már mentésre kerül, de a `PublicBookReader` nem azt rendereli.
- A flipbook komponens jelenleg nincs használatban, és a nyers HTML tartalom kezelését ki kell egészíteni, különben tördelési hibát ad.
- A javítás főként 3 fájlban történik: `PublicBookReader.tsx`, `BookFlipView.tsx`, `useBookShare.ts`.
