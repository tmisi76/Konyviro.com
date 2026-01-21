export type ExportFormat = "docx" | "pdf" | "epub" | "txt";

export type FontFamily = "Merriweather" | "Georgia" | "Times New Roman";
export type FontSize = "11pt" | "12pt" | "14pt";
export type PageSize = "A4" | "A5" | "Letter";
export type LineSpacing = "1.0" | "1.5" | "2.0";

export interface ExportSettings {
  includeTitlePage: boolean;
  includeTableOfContents: boolean;
  fontFamily: FontFamily;
  fontSize: FontSize;
  pageSize: PageSize;
  lineSpacing: LineSpacing;
}

export interface CoverSettings {
  backgroundColor: string;
  backgroundImage?: string;
  titleText: string;
  authorName: string;
  titleColor: string;
  authorColor: string;
  titleFontSize: number;
  authorFontSize: number;
}

export interface ExportFormatOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: string;
  extension: string;
}

export const EXPORT_FORMATS: ExportFormatOption[] = [
  {
    id: "docx",
    name: "Word",
    description: "Szerkeszthető dokumentum",
    icon: "FileText",
    extension: ".docx",
  },
  {
    id: "pdf",
    name: "PDF",
    description: "Nyomtatásra kész",
    icon: "FileType",
    extension: ".pdf",
  },
  {
    id: "epub",
    name: "ePub",
    description: "E-könyv olvasókhoz",
    icon: "BookOpen",
    extension: ".epub",
  },
  {
    id: "txt",
    name: "TXT",
    description: "Egyszerű szöveg",
    icon: "File",
    extension: ".txt",
  },
];

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  includeTitlePage: true,
  includeTableOfContents: true,
  fontFamily: "Merriweather",
  fontSize: "12pt",
  pageSize: "A4",
  lineSpacing: "1.5",
};

export const DEFAULT_COVER_SETTINGS: CoverSettings = {
  backgroundColor: "#1a1a2e",
  titleText: "",
  authorName: "",
  titleColor: "#ffffff",
  authorColor: "#a0a0a0",
  titleFontSize: 48,
  authorFontSize: 24,
};
