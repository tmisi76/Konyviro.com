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
