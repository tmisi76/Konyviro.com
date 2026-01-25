export type ExportFormat = "epub" | "pdf" | "mobi" | "docx";

// Legacy types for backward compatibility with ProjectExport page
export type FontFamily = "Merriweather" | "PT Serif" | "Literata" | "Open Sans" | "Georgia" | "Times New Roman";
export type FontSize = "11pt" | "12pt" | "14pt";
export type PageSize = "A4" | "A5" | "Letter";
export type LineSpacing = "1.0" | "1.2" | "1.5" | "1.8" | "2.0";
export type MarginStyle = "normal" | "wide" | "narrow";

export interface ExportSettings {
  includeTitlePage: boolean;
  includeTableOfContents: boolean;
  includeChapterNumbers: boolean;
  fontFamily: FontFamily;
  fontSize: FontSize;
  lineSpacing: LineSpacing;
  pageSize: PageSize;
  marginStyle: MarginStyle;
}

export interface ExportMetadata {
  subtitle?: string;
  publisher?: string;
  isbn?: string;
  description?: string;
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
  recommended?: boolean;
}

export const EXPORT_FORMATS: ExportFormatOption[] = [
  {
    id: "epub",
    name: "ePub",
    description: "E-könyv olvasókhoz (Kobo, Apple Books)",
    icon: "📱",
    recommended: true,
  },
  {
    id: "pdf",
    name: "PDF",
    description: "Nyomtatásra kész, fix elrendezés",
    icon: "📄",
  },
  {
    id: "mobi",
    name: "MOBI",
    description: "Amazon Kindle eszközökhöz",
    icon: "📖",
  },
  {
    id: "docx",
    name: "Word",
    description: "Szerkeszthető dokumentum",
    icon: "📝",
  },
];

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  includeTitlePage: true,
  includeTableOfContents: true,
  includeChapterNumbers: false,
  fontFamily: "Merriweather",
  fontSize: "12pt",
  lineSpacing: "1.5",
  pageSize: "A5",
  marginStyle: "normal",
};

export const DEFAULT_EXPORT_METADATA: ExportMetadata = {
  publisher: "KönyvÍró AI",
};

export interface ExportRecord {
  id: string;
  project_id: string;
  user_id: string;
  format: ExportFormat;
  settings: ExportSettings & ExportMetadata;
  file_url?: string;
  file_size?: number;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// Export limits per subscription tier
export const EXPORT_LIMITS: Record<string, number> = {
  free: 2,
  hobby: 5,
  writer: 20,
  pro: -1, // unlimited
};
