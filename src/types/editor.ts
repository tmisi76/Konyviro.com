export type BlockType = 
  | 'paragraph' 
  | 'heading1' 
  | 'heading2' 
  | 'heading3' 
  | 'bulletList' 
  | 'numberedList' 
  | 'quote' 
  | 'callout' 
  | 'divider' 
  | 'image';

export type ChapterStatus = 'draft' | 'in_progress' | 'done';

export interface Block {
  id: string;
  chapter_id: string;
  type: BlockType;
  content: string;
  metadata: {
    calloutType?: 'info' | 'warning' | 'tip';
    imageUrl?: string;
    [key: string]: unknown;
  };
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  project_id: string;
  title: string;
  status: ChapterStatus;
  summary: string | null;
  key_points: string[];
  word_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BlockTypeOption {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
  shortcut?: string;
}

export const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  { type: 'paragraph', label: 'Bekezdés', icon: '¶', description: 'Normál szöveg', shortcut: '' },
  { type: 'heading1', label: 'Címsor 1', icon: 'H1', description: 'Nagy címsor', shortcut: '# ' },
  { type: 'heading2', label: 'Címsor 2', icon: 'H2', description: 'Közepes címsor', shortcut: '## ' },
  { type: 'heading3', label: 'Címsor 3', icon: 'H3', description: 'Kis címsor', shortcut: '### ' },
  { type: 'bulletList', label: 'Felsorolás', icon: '•', description: 'Listapont', shortcut: '- ' },
  { type: 'numberedList', label: 'Számozott lista', icon: '1.', description: 'Számozott elem', shortcut: '1. ' },
  { type: 'quote', label: 'Idézet', icon: '"', description: 'Idézet blokk', shortcut: '> ' },
  { type: 'callout', label: 'Kiemelés', icon: '💡', description: 'Színes kiemelés' },
  { type: 'divider', label: 'Elválasztó', icon: '—', description: 'Vízszintes vonal' },
  { type: 'image', label: 'Kép', icon: '🖼', description: 'Kép beszúrása' },
];

export type ProjectGenre = 'szakkonyv' | 'fiction' | 'erotikus';

export interface ChapterTemplate {
  title: string;
  description: string;
}

export const CHAPTER_TEMPLATES: Record<ProjectGenre, ChapterTemplate[]> = {
  szakkonyv: [
    { title: 'Bevezetés', description: 'A téma és célok ismertetése' },
    { title: 'Fő tartalom', description: 'A szakmai anyag kifejtése' },
    { title: 'Összefoglaló', description: 'Kulcspontok összefoglalása' },
    { title: 'Gyakorlatok', description: 'Alkalmazási feladatok' },
  ],
  fiction: [
    { title: 'Jelenet', description: 'Esemény, helyszín bemutatása' },
    { title: 'Dialógus', description: 'Karakterek párbeszéde' },
    { title: 'Leírás', description: 'Részletes környezetrajz' },
    { title: 'Cselekmény fordulat', description: 'Váratlan esemény' },
  ],
  erotikus: [
    { title: 'Hangulat építés', description: 'Atmoszféra teremtése' },
    { title: 'Közeledés', description: 'Karakterek közti dinamika' },
    { title: 'Kulminálás', description: 'Érzelmi és fizikai csúcspont' },
    { title: 'Lezárás', description: 'Következmények, reflexió' },
  ],
};

export const STATUS_LABELS: Record<ChapterStatus, string> = {
  draft: 'Piszkozat',
  in_progress: 'Folyamatban',
  done: 'Kész',
};

export const STATUS_COLORS: Record<ChapterStatus, string> = {
  draft: 'bg-muted-foreground',
  in_progress: 'bg-warning',
  done: 'bg-success',
};
