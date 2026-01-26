export type CharacterRole = 'foszereploő' | 'mellekszereploő' | 'antagonista';
export type RelationshipType = 'barat' | 'ellenseg' | 'szerelmi' | 'csaladi' | 'munkatars' | 'egyeb';

export interface Character {
  id: string;
  project_id: string;
  name: string;
  nickname: string | null;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  role: CharacterRole;
  avatar_url: string | null;
  
  // Appearance
  hair_color: string | null;
  eye_color: string | null;
  height: string | null;
  body_type: string | null;
  distinguishing_features: string | null;
  appearance_description: string | null;
  
  // Personality
  motivations: string[];
  fears: string[];
  positive_traits: string[];
  negative_traits: string[];
  speech_style: string | null;
  
  // Character Voice (AI generated)
  character_voice: string | null;
  
  // Backstory
  backstory: string | null;
  key_events: KeyEvent[];
  
  created_at: string;
  updated_at: string;
}

export interface KeyEvent {
  id: string;
  title: string;
  description: string;
  age?: number;
}

export interface CharacterRelationship {
  id: string;
  character_id: string;
  related_character_id: string;
  relationship_type: RelationshipType;
  description: string | null;
  created_at: string;
  related_character?: Character;
}

export const ROLE_LABELS: Record<CharacterRole, string> = {
  'foszereploő': 'Főszereplő',
  'mellekszereploő': 'Mellékszereplő',
  'antagonista': 'Antagonista',
};

export const ROLE_COLORS: Record<CharacterRole, string> = {
  'foszereploő': 'bg-primary text-primary-foreground',
  'mellekszereploő': 'bg-secondary text-secondary-foreground',
  'antagonista': 'bg-destructive text-destructive-foreground',
};

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  'barat': 'Barát',
  'ellenseg': 'Ellenség',
  'szerelmi': 'Szerelmi',
  'csaladi': 'Családi',
  'munkatars': 'Munkatárs',
  'egyeb': 'Egyéb',
};

export const GENDER_OPTIONS = [
  { value: 'ferfi', label: 'Férfi' },
  { value: 'no', label: 'Nő' },
  { value: 'egyeb', label: 'Egyéb' },
];

export const BODY_TYPE_OPTIONS = [
  { value: 'vekony', label: 'Vékony' },
  { value: 'atletas', label: 'Atlétikus' },
  { value: 'atlagos', label: 'Átlagos' },
  { value: 'telt', label: 'Telt' },
  { value: 'izmos', label: 'Izmos' },
];

export const HAIR_COLOR_OPTIONS = [
  { value: 'fekete', label: 'Fekete' },
  { value: 'barna', label: 'Barna' },
  { value: 'szoke', label: 'Szőke' },
  { value: 'voros', label: 'Vörös' },
  { value: 'oszes', label: 'Őszes' },
  { value: 'feher', label: 'Fehér' },
  { value: 'egyeb', label: 'Egyéb' },
];

export const EYE_COLOR_OPTIONS = [
  { value: 'barna', label: 'Barna' },
  { value: 'kek', label: 'Kék' },
  { value: 'zold', label: 'Zöld' },
  { value: 'szurke', label: 'Szürke' },
  { value: 'mogyoro', label: 'Mogyoró' },
  { value: 'egyeb', label: 'Egyéb' },
];
