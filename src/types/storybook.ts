// Storybook (Mesekönyv) types and interfaces

export type StorybookTheme = 
  | "adventure" 
  | "friendship" 
  | "family" 
  | "animals" 
  | "magic" 
  | "nature" 
  | "bedtime" 
  | "learning"
  | "custom";

export interface StorybookThemeInfo {
  id: StorybookTheme;
  icon: string;
  title: string;
  description: string;
  samplePrompt: string;
}

export const STORYBOOK_THEMES: StorybookThemeInfo[] = [
  { 
    id: "adventure", 
    icon: "🗺️", 
    title: "Kaland", 
    description: "Izgalmas utazások és felfedezések",
    samplePrompt: "A főszereplő egy varázslatos erdőben kalandozik"
  },
  { 
    id: "friendship", 
    icon: "🤝", 
    title: "Barátság", 
    description: "A barátság erejéről szóló történetek",
    samplePrompt: "Új barátot talál és együtt oldanak meg problémákat"
  },
  { 
    id: "family", 
    icon: "👨‍👩‍👧", 
    title: "Család", 
    description: "Családi szeretet és összetartozás",
    samplePrompt: "A család együtt tölt egy különleges napot"
  },
  { 
    id: "animals", 
    icon: "🐻", 
    title: "Állatok", 
    description: "Kedves állatos történetek",
    samplePrompt: "Állat barátokkal él át kalandokat"
  },
  { 
    id: "magic", 
    icon: "✨", 
    title: "Varázslat", 
    description: "Mágikus világok és csodák",
    samplePrompt: "Varázserőre tesz szert és segít másokon"
  },
  { 
    id: "nature", 
    icon: "🌳", 
    title: "Természet", 
    description: "A természet szépségei és titkai",
    samplePrompt: "A természetben fedez fel csodálatos dolgokat"
  },
  { 
    id: "bedtime", 
    icon: "🌙", 
    title: "Esti mese", 
    description: "Nyugtató, álomba ringató történetek",
    samplePrompt: "Egy békés este és az álmok világa"
  },
  { 
    id: "learning", 
    icon: "📚", 
    title: "Tanulás", 
    description: "Játékos tanulás és felfedezés",
    samplePrompt: "Új dolgokat tanul szórakoztató módon"
  },
  { 
    id: "custom", 
    icon: "🎨", 
    title: "Egyedi", 
    description: "Saját történet ötlet",
    samplePrompt: ""
  },
];

export type IllustrationStyle = 
  | "watercolor" 
  | "cartoon" 
  | "digital-painting" 
  | "hand-drawn" 
  | "pixar-3d"
  | "classic-fairytale";

export interface IllustrationStyleInfo {
  id: IllustrationStyle;
  icon: string;
  title: string;
  description: string;
  promptModifier: string;
}

export const ILLUSTRATION_STYLES: IllustrationStyleInfo[] = [
  { 
    id: "watercolor", 
    icon: "🎨", 
    title: "Akvarell", 
    description: "Lágy, festői akvarell stílus",
    promptModifier: "soft watercolor illustration style, gentle colors, dreamy atmosphere, children's book illustration"
  },
  { 
    id: "cartoon", 
    icon: "🖼️", 
    title: "Rajzfilm", 
    description: "Vidám, színes rajzfilm stílus",
    promptModifier: "colorful cartoon illustration, friendly characters, vibrant colors, children's book style"
  },
  { 
    id: "digital-painting", 
    icon: "💻", 
    title: "Digitális festmény", 
    description: "Modern digitális művészet",
    promptModifier: "digital painting, detailed illustration, rich colors, professional children's book art"
  },
  { 
    id: "hand-drawn", 
    icon: "✏️", 
    title: "Kézzel rajzolt", 
    description: "Meleg, kézzel rajzolt hatás",
    promptModifier: "hand-drawn illustration style, pencil and ink, warm and cozy feeling, traditional children's book"
  },
  { 
    id: "pixar-3d", 
    icon: "🎬", 
    title: "Pixar 3D", 
    description: "Modern 3D animációs stílus",
    promptModifier: "Pixar-style 3D illustration, cute character design, cinematic lighting, high quality render"
  },
  { 
    id: "classic-fairytale", 
    icon: "📖", 
    title: "Klasszikus mese", 
    description: "Hagyományos mesekönyv illusztráció",
    promptModifier: "classic fairytale illustration, vintage storybook style, enchanting and magical, golden age children's book"
  },
];

export type AgeGroup = "0-3" | "3-6" | "6-9";

export interface AgeGroupInfo {
  id: AgeGroup;
  title: string;
  description: string;
  pageCount: number;
  wordCountPerPage: number;
}

export const AGE_GROUPS: AgeGroupInfo[] = [
  { 
    id: "0-3", 
    title: "0-3 év", 
    description: "Egyszerű képek, kevés szöveg",
    pageCount: 8,
    wordCountPerPage: 10
  },
  { 
    id: "3-6", 
    title: "3-6 év", 
    description: "Rövid mondatok, színes képek",
    pageCount: 12,
    wordCountPerPage: 30
  },
  { 
    id: "6-9", 
    title: "6-9 év", 
    description: "Hosszabb történet, részletes képek",
    pageCount: 16,
    wordCountPerPage: 50
  },
];

export interface CharacterProfile {
  gender?: string;
  age?: string;
  hairColor?: string;
  hairStyle?: string;
  eyeColor?: string;
  clothing?: string;
  distinguishingFeatures?: string;
  fullDescription?: string;
}

export interface CharacterPhoto {
  id: string;
  originalUrl: string;
  processedUrl?: string;
  name: string;
  role: "main" | "supporting";
  description?: string;
  profile?: CharacterProfile;
  isAnalyzing?: boolean;
}

export interface StorybookPage {
  id: string;
  pageNumber: number;
  text: string;
  illustrationPrompt: string;
  illustrationUrl?: string;
  isGenerating?: boolean;
}

export interface StorybookData {
  // Basic info
  title: string;
  theme: StorybookTheme | null;
  customThemeDescription?: string;
  ageGroup: AgeGroup | null;
  illustrationStyle: IllustrationStyle | null;
  
  // Characters
  characters: CharacterPhoto[];
  
  // Story
  storyPrompt: string;
  generatedStory?: string;
  
  // Pages
  pages: StorybookPage[];
  
  // Cover
  coverUrl?: string;
  
  // Project reference
  projectId: string | null;
}

export const INITIAL_STORYBOOK_DATA: StorybookData = {
  title: "",
  theme: null,
  ageGroup: null,
  illustrationStyle: null,
  characters: [],
  storyPrompt: "",
  pages: [],
  projectId: null,
};

// Storybook wizard steps
export type StorybookWizardStep = 
  | "theme"
  | "age-group"
  | "characters"
  | "style"
  | "story"
  | "generate"
  | "preview";

export const STORYBOOK_WIZARD_STEPS: { id: StorybookWizardStep; title: string; description: string }[] = [
  { id: "theme", title: "Téma", description: "Válaszd ki a mese témáját" },
  { id: "age-group", title: "Korosztály", description: "Kinek szól a mese?" },
  { id: "characters", title: "Szereplők", description: "Töltsd fel a fotókat" },
  { id: "style", title: "Stílus", description: "Válaszd ki az illusztráció stílust" },
  { id: "story", title: "Történet", description: "Add meg a történet vázlatát" },
  { id: "generate", title: "Generálás", description: "AI készíti a mesét" },
  { id: "preview", title: "Előnézet", description: "Nézd meg és szerkeszd" },
];
