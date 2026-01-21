export type SourceType = 'weboldal' | 'konyv' | 'cikk' | 'egyeb';

export type BibliographyFormat = 'apa' | 'chicago' | 'custom';

export interface Source {
  id: string;
  project_id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  year: number | null;
  url: string | null;
  source_type: SourceType;
  notes: string | null;
  tags: string[];
  is_starred: boolean;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  id: string;
  chapter_id: string;
  source_id: string;
  block_id: string | null;
  citation_number: number;
  page_reference: string | null;
  created_at: string;
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  weboldal: 'Weboldal',
  konyv: 'Könyv',
  cikk: 'Cikk',
  egyeb: 'Egyéb',
};

export const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  weboldal: 'bg-blue-500/10 text-blue-600',
  konyv: 'bg-purple-500/10 text-purple-600',
  cikk: 'bg-green-500/10 text-green-600',
  egyeb: 'bg-muted text-muted-foreground',
};
