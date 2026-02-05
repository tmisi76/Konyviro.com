import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
} from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import type { Chapter } from "@/types/editor";
import type { Character } from "@/types/character";

// Local types for legacy export utils
type LegacyExportFormat = "docx" | "pdf" | "epub" | "txt";
type LegacyLineSpacing = "1.0" | "1.2" | "1.5" | "1.8" | "2.0";
type LegacyFontFamily = "Merriweather" | "Georgia" | "Times New Roman" | "PT Serif" | "Literata" | "Open Sans";
type LegacyFontSize = "11pt" | "12pt" | "14pt";
type LegacyPageSize = "A4" | "A5" | "Letter";

interface LegacyExportSettings {
  includeTitlePage: boolean;
  includeTableOfContents: boolean;
  fontFamily: LegacyFontFamily;
  fontSize: LegacyFontSize;
  pageSize: LegacyPageSize;
  lineSpacing: LegacyLineSpacing;
  includeChapterNumbers?: boolean;
  marginStyle?: string;
}
import type { Source } from "@/types/research";

interface ExportData {
  projectTitle: string;
  authorName?: string;
  chapters: Chapter[];
  chapterContents: Record<string, string>;
  settings: LegacyExportSettings;
  characters?: Character[];
  sources?: Source[];
}

const fontSizeMap: Record<string, number> = {
  "11pt": 22,
  "12pt": 24,
  "14pt": 28,
};

// ============ DOCX Export ============
export async function exportToDocx(data: ExportData): Promise<Blob> {
  const { projectTitle, authorName, chapters, chapterContents, settings } = data;
  const fontSize = fontSizeMap[settings.fontSize] || 24;

  const children: Paragraph[] = [];

  // Title page
  if (settings.includeTitlePage) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "", size: fontSize })],
      }),
      new Paragraph({
        children: [new TextRun({ text: "", size: fontSize })],
      }),
      new Paragraph({
        children: [new TextRun({ text: "", size: fontSize })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: projectTitle,
            bold: true,
            size: fontSize * 2,
            font: settings.fontFamily,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: authorName || "",
            size: fontSize * 1.5,
            font: settings.fontFamily,
          }),
        ],
      }),
      new Paragraph({
        children: [new PageBreak()],
      })
    );
  }

  // Table of contents
  if (settings.includeTableOfContents) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: "Tartalomjegyzék",
            bold: true,
            size: fontSize * 1.5,
            font: settings.fontFamily,
          }),
        ],
      })
    );
    
    // Manual TOC entries
    chapters.forEach((chapter, index) => {
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: `${index + 1}. ${chapter.title}`,
              size: fontSize,
              font: settings.fontFamily,
            }),
          ],
        })
      );
    });

    children.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );
  }

  // Chapters
  chapters.forEach((chapter, index) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: `${index + 1}. ${chapter.title}`,
            bold: true,
            size: fontSize * 1.5,
            font: settings.fontFamily,
          }),
        ],
      })
    );

    const content = chapterContents[chapter.id] || "";
    const paragraphs = content.split("\n\n");

    paragraphs.forEach((para) => {
      if (para.trim()) {
        children.push(
          new Paragraph({
            spacing: {
              line: settings.lineSpacing === "2.0" ? 480 : settings.lineSpacing === "1.5" ? 360 : 240,
              after: 200,
            },
            children: [
              new TextRun({
                text: para,
                size: fontSize,
                font: settings.fontFamily,
              }),
            ],
          })
        );
      }
    });

    // Page break after each chapter except the last
    if (index < chapters.length - 1) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

// ============ PDF Export ============
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

  // Helper: Create new page and return page + starting y position
  const createNewPage = (): { page: ReturnType<typeof pdfDoc.addPage>; y: number } => {
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

  // Table of contents with multi-page support
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
      // Check if we need a new page for TOC
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

  // Chapters with FULL MULTI-PAGE SUPPORT
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

    // Chapter content - RENDER ALL CONTENT with pagination
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
          // Check if we need a new page BEFORE drawing
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
          line = word;
        } else {
          line = testLine;
        }
      }

      // Draw the last line of the paragraph
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

      // Paragraph spacing
      y -= lineHeight * 0.5;
    }
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
}

// ============ ePub Export ============
export async function exportToEpub(data: ExportData): Promise<Blob> {
  const { projectTitle, authorName, chapters, chapterContents } = data;

  // Create a simple HTML-based epub structure
  const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:${crypto.randomUUID()}</dc:identifier>
    <dc:title>${projectTitle}</dc:title>
    <dc:creator>${authorName || "Unknown"}</dc:creator>
    <dc:language>hu</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().slice(0, 19)}Z</meta>
  </metadata>
  <manifest>
    ${chapters.map((c, i) => `<item id="chapter${i}" href="chapter${i}.xhtml" media-type="application/xhtml+xml"/>`).join("\n    ")}
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    ${chapters.map((_, i) => `<itemref idref="chapter${i}"/>`).join("\n    ")}
  </spine>
</package>`;

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
  <nav epub:type="toc">
    <h1>Tartalomjegyzék</h1>
    <ol>
      ${chapters.map((c, i) => `<li><a href="chapter${i}.xhtml">${i + 1}. ${c.title}</a></li>`).join("\n      ")}
    </ol>
  </nav>
</body>
</html>`;

  const chapterXhtmls = chapters.map((chapter, i) => {
    const content = chapterContents[chapter.id] || "";
    const paragraphs = content
      .split("\n\n")
      .filter((p) => p.trim())
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join("\n");

    return {
      name: `chapter${i}.xhtml`,
      content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${chapter.title}</title></head>
<body>
  <h1>${i + 1}. ${escapeHtml(chapter.title)}</h1>
  ${paragraphs || "<p>(Üres fejezet)</p>"}
</body>
</html>`,
    };
  });

  // For simplicity, return HTML content as a blob
  // A full implementation would use a library like jszip
  const epubContent = `
EPUB Structure (simplified preview):
=====================================
${container}

${contentOpf}

${nav}

${chapterXhtmls.map((c) => `--- ${c.name} ---\n${c.content}`).join("\n\n")}
  `;

  return new Blob([epubContent], { type: "application/epub+zip" });
}

// ============ TXT Export ============
export async function exportToTxt(data: ExportData): Promise<Blob> {
  const { projectTitle, authorName, chapters, chapterContents, settings } = data;

  let content = "";

  // Title
  if (settings.includeTitlePage) {
    content += `${"=".repeat(50)}\n`;
    content += `${projectTitle}\n`;
    if (authorName) content += `${authorName}\n`;
    content += `${"=".repeat(50)}\n\n`;
  }

  // Table of contents
  if (settings.includeTableOfContents) {
    content += "TARTALOMJEGYZÉK\n";
    content += "-".repeat(30) + "\n";
    chapters.forEach((chapter, index) => {
      content += `${index + 1}. ${chapter.title}\n`;
    });
    content += "\n\n";
  }

  // Chapters
  chapters.forEach((chapter, index) => {
    content += "-".repeat(50) + "\n";
    content += `${index + 1}. ${chapter.title}\n`;
    content += "-".repeat(50) + "\n\n";
    content += chapterContents[chapter.id] || "(Üres fejezet)";
    content += "\n\n";
  });

  return new Blob([content], { type: "text/plain;charset=utf-8" });
}

// ============ Character List Export ============
export async function exportCharacterList(
  characters: Character[],
  projectTitle: string
): Promise<Blob> {
  let content = `KARAKTER LISTA - ${projectTitle}\n`;
  content += "=".repeat(50) + "\n\n";

  characters.forEach((char) => {
    content += `NÉV: ${char.name}`;
    if (char.nickname) content += ` ("${char.nickname}")`;
    content += "\n";

    if (char.role) content += `Szerep: ${char.role}\n`;
    if (char.age) content += `Életkor: ${char.age}\n`;
    if (char.occupation) content += `Foglalkozás: ${char.occupation}\n`;

    if (char.positive_traits?.length) {
      content += `Pozitív tulajdonságok: ${char.positive_traits.join(", ")}\n`;
    }
    if (char.negative_traits?.length) {
      content += `Negatív tulajdonságok: ${char.negative_traits.join(", ")}\n`;
    }
    if (char.backstory) {
      content += `Háttértörténet: ${char.backstory}\n`;
    }

    content += "\n" + "-".repeat(30) + "\n\n";
  });

  return new Blob([content], { type: "text/plain;charset=utf-8" });
}

// ============ Bibliography Export ============
export async function exportBibliography(
  sources: Source[],
  projectTitle: string,
  format: "apa" | "chicago" = "apa"
): Promise<Blob> {
  let content = `BIBLIOGRÁFIA - ${projectTitle}\n`;
  content += "=".repeat(50) + "\n\n";

  sources.forEach((source, index) => {
    if (format === "apa") {
      // APA format
      let citation = "";
      if (source.author) citation += `${source.author} `;
      if (source.year) citation += `(${source.year}). `;
      citation += `${source.title}. `;
      if (source.publisher) citation += `${source.publisher}. `;
      if (source.url) citation += `Retrieved from ${source.url}`;
      content += `[${index + 1}] ${citation}\n\n`;
    } else {
      // Chicago format
      let citation = "";
      if (source.author) citation += `${source.author}. `;
      citation += `"${source.title}." `;
      if (source.publisher) citation += `${source.publisher}, `;
      if (source.year) citation += `${source.year}. `;
      if (source.url) citation += `${source.url}.`;
      content += `${index + 1}. ${citation}\n\n`;
    }
  });

  return new Blob([content], { type: "text/plain;charset=utf-8" });
}

// ============ Main Export Function ============
export async function exportBook(
  format: LegacyExportFormat,
  data: ExportData
): Promise<void> {
  let blob: Blob;
  let filename: string;

  const sanitizedTitle = data.projectTitle.replace(/[^a-zA-Z0-9áéíóöőúüű\s]/gi, "").replace(/\s+/g, "_");

  switch (format) {
    case "docx":
      blob = await exportToDocx(data);
      filename = `${sanitizedTitle}.docx`;
      break;
    case "pdf":
      blob = await exportToPdf(data);
      filename = `${sanitizedTitle}.pdf`;
      break;
    case "epub":
      blob = await exportToEpub(data);
      filename = `${sanitizedTitle}.epub`;
      break;
    case "txt":
      blob = await exportToTxt(data);
      filename = `${sanitizedTitle}.txt`;
      break;
    default:
      throw new Error("Unsupported format");
  }

  saveAs(blob, filename);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
