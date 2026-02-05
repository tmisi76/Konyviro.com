
# Terv: PDF Export Javítása - Hiányzó Tartalom Probléma

## Probléma Azonosítása

A 60.198 szavas szakkönyvből mindössze ~1.200 szó került a PDF-be, mert a kliens-oldali PDF export (`src/lib/exportUtils.ts`) nem támogatja a többoldalas dokumentumokat.

### Gyökérok (279-313. sorok az `exportToPdf` függvényben)

```typescript
chapters.forEach((chapter, index) => {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);  // ← 1 oldal / fejezet
    // ...
    for (const word of words) {
      // ... szavak renderelése ...
      
      if (y < margin) {
        // Would need new page - simplified version just stops
        break;  // ← MEGÁLL HA ELFOGYOTT AZ OLDAL!
      }
    }
});
```

**Minden fejezethez csak 1 oldal jön létre, és ha a tartalom nem fér el, a rendszer egyszerűen megáll.**

## Megoldási Lehetőségek

| Megoldás | Előnyök | Hátrányok |
|----------|---------|-----------|
| A) `exportToPdf` javítása többoldalas támogatással | Helyi export, nincs szerverköltség | Bonyolult implementáció, font limitációk |
| B) ProjectExport átirányítása a CloudConvert-re | Már működik, professzionális minőség | Függőség a szervertől |
| C) ProjectExport oldal törlése, BookExportModal használata | Egyszerűsítés, egy export rendszer | Kisebb funkcióvesztés |

**Javaslat: A) + B) kombináció** - Javítjuk a kliens-oldali PDF exportot, hogy többoldalas legyen.

## Részletes Változtatások

### 1. `src/lib/exportUtils.ts` - `exportToPdf` függvény javítása

A PDF exportot úgy kell módosítani, hogy:
1. Ha a tartalom túlnyúlik az oldalon, új oldalt hozzon létre
2. Minden szót helyesen tördeljen oldalak között
3. A fejezet címét minden új oldal tetején ne ismételje (kivéve az elsőt)

**Javított logika:**

```typescript
export async function exportToPdf(data: ExportData): Promise<Blob> {
  const { projectTitle, authorName, chapters, chapterContents, settings } = data;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const pageSizes: Record<string, [number, number]> = {
    A4: [595.28, 841.89],
    A5: [419.53, 595.28],
    Letter: [612, 792],
  };

  const [pageWidth, pageHeight] = pageSizes[settings.pageSize] || pageSizes.A4;
  const margin = 72;
  const contentWidth = pageWidth - margin * 2;
  const fontSize = parseInt(settings.fontSize) || 12;
  const lineHeight = fontSize * (parseFloat(settings.lineSpacing) || 1.5);

  // Helper: Új oldal létrehozása
  const createNewPage = () => {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    return { page, y: pageHeight - margin };
  };

  // Title page
  if (settings.includeTitlePage) {
    const titlePage = pdfDoc.addPage([pageWidth, pageHeight]);
    titlePage.drawText(projectTitle, {
      x: margin,
      y: pageHeight / 2 + 50,
      size: fontSize * 2,
      font: boldFont,
      maxWidth: contentWidth,
    });
    if (authorName) {
      titlePage.drawText(authorName, {
        x: margin,
        y: pageHeight / 2 - 50,
        size: fontSize * 1.5,
        font: font,
      });
    }
  }

  // Table of contents
  if (settings.includeTableOfContents && chapters.length > 0) {
    let { page, y } = createNewPage();
    page.drawText("Tartalomjegyzék", {
      x: margin,
      y,
      size: fontSize * 1.5,
      font: boldFont,
    });
    y -= lineHeight * 2;

    chapters.forEach((chapter, index) => {
      if (y < margin + lineHeight) {
        const newPage = createNewPage();
        page = newPage.page;
        y = newPage.y;
      }
      page.drawText(`${index + 1}. ${chapter.title}`, {
        x: margin,
        y,
        size: fontSize,
        font: font,
      });
      y -= lineHeight;
    });
  }

  // Chapters - JAVÍTOTT TÖBBOLDALAS TÁMOGATÁSSAL
  chapters.forEach((chapter, chapterIndex) => {
    let { page, y } = createNewPage();

    // Chapter title
    page.drawText(`${chapterIndex + 1}. ${chapter.title}`, {
      x: margin,
      y,
      size: fontSize * 1.5,
      font: boldFont,
      maxWidth: contentWidth,
    });
    y -= lineHeight * 2;

    // Chapter content - TELJES TARTALOM RENDERELÉSE
    const content = chapterContents[chapter.id] || "";
    const paragraphs = content.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;

      const words = paragraph.split(/\s+/);
      let line = "";

      for (const word of words) {
        const testLine = line + (line ? " " : "") + word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (textWidth > contentWidth && line) {
          // Sor renderelése
          if (y < margin) {
            // ÚJ OLDAL LÉTREHOZÁSA ha elfogyott a hely
            const newPage = createNewPage();
            page = newPage.page;
            y = newPage.y;
          }
          page.drawText(line, {
            x: margin,
            y,
            size: fontSize,
            font: font,
          });
          y -= lineHeight;
          line = word;
        } else {
          line = testLine;
        }
      }

      // Utolsó sor a bekezdésben
      if (line) {
        if (y < margin) {
          const newPage = createNewPage();
          page = newPage.page;
          y = newPage.y;
        }
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font: font,
        });
        y -= lineHeight;
      }

      // Bekezdés utáni térköz
      y -= lineHeight * 0.5;
    }
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
}
```

### 2. Érintett Fájlok

| Fájl | Változtatás |
|------|-------------|
| `src/lib/exportUtils.ts` | `exportToPdf` függvény átírása többoldalas támogatással |

## Folyamat a Javítás Után

```text
1. Felhasználó kattint: "Exportálás" → "PDF"
2. exportBook() → exportToPdf() hívás
3. Minden fejezet feldolgozása:
   - Címoldal (ha be van kapcsolva)
   - Tartalomjegyzék (ha be van kapcsolva)
   - Fejezetek: ÚJ OLDALAK LÉTREHOZÁSA ha szükséges
4. 60.000+ szó → ~200-300 oldalas PDF
5. saveAs() → letöltés
```

## Alternatív Megoldás (Gyorsabb)

Ha a kliens-oldali PDF export nem prioritás, egyszerűen **átirányíthatjuk a ProjectExport oldalt a BookExportModal-ra**, ami már a CloudConvert-et használja és helyesen működik.

## Technikai Megjegyzések

- A `pdf-lib` könyvtár támogatja a többoldalas dokumentumokat
- A font beágyazás limitált (StandardFonts), ezért magyar karakterek problémásak lehetnek
- A CloudConvert megoldás professzionálisabb eredményt ad (jobb font támogatás, stílusok)
