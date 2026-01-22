// Wizard step types and interfaces

export type Genre = "szakkonyv" | "fiction";

// Author profile for non-fiction books
export interface AuthorProfile {
  authorName: string;
  formality: "tegez" | "magaz";
  authorBackground: string;
  personalStories: string;
  mainPromise: string;
}

export type FictionSubcategory = 
  | "thriller" 
  | "krimi" 
  | "romantikus" 
  | "scifi" 
  | "fantasy" 
  | "horror" 
  | "erotikus" 
  | "drama" 
  | "kaland" 
  | "tortenelmi";

export type NonfictionSubcategory = 
  | "uzlet" 
  | "onfejlesztes" 
  | "egeszseg" 
  | "tech" 
  | "penzugyek" 
  | "marketing" 
  | "vezetes" 
  | "pszichologia" 
  | "oktatas" 
  | "lifestyle";

export type Subcategory = FictionSubcategory | NonfictionSubcategory;

export type Tone = "light" | "professional" | "dramatic" | "humorous" | "dark";

export type BookLength = "short" | "medium" | "long";

export type WritingStatus = "draft" | "in_progress" | "paused" | "completed";

export interface StoryIdea {
  id: string;
  title: string;
  synopsis: string;
  mainElements: string[];
  uniqueSellingPoint: string;
  mood: string;
}

export interface ChapterOutlineItem {
  id: string;
  number: number;
  title: string;
  description: string;
  keyPoints: string[];
  estimatedWords: number;
}

export interface WizardData {
  genre: Genre | null;
  subcategory: Subcategory | null;
  title: string;
  targetAudience: string;
  tone: Tone | null;
  length: BookLength | null;
  additionalInstructions: string;
  storyIdeas: StoryIdea[];
  selectedStoryIdea: StoryIdea | null;
  detailedConcept: string;
  chapterOutline: ChapterOutlineItem[];
  projectId: string | null;
  // Non-fiction specific
  authorProfile: AuthorProfile | null;
}

export const INITIAL_WIZARD_DATA: WizardData = {
  genre: null,
  subcategory: null,
  title: "",
  targetAudience: "",
  tone: null,
  length: null,
  additionalInstructions: "",
  storyIdeas: [],
  selectedStoryIdea: null,
  detailedConcept: "",
  chapterOutline: [],
  projectId: null,
  authorProfile: null,
};

export const FICTION_SUBCATEGORIES: { id: FictionSubcategory; icon: string; title: string; isAdult?: boolean }[] = [
  { id: "thriller", icon: "🔪", title: "Thriller" },
  { id: "krimi", icon: "🔍", title: "Krimi" },
  { id: "romantikus", icon: "💕", title: "Romantikus" },
  { id: "scifi", icon: "🚀", title: "Sci-Fi" },
  { id: "fantasy", icon: "🐉", title: "Fantasy" },
  { id: "horror", icon: "👻", title: "Horror" },
  { id: "erotikus", icon: "🔥", title: "Erotikus", isAdult: true },
  { id: "drama", icon: "🎭", title: "Dráma" },
  { id: "kaland", icon: "🗺️", title: "Kaland" },
  { id: "tortenelmi", icon: "🏰", title: "Történelmi" },
];

export const NONFICTION_SUBCATEGORIES: { id: NonfictionSubcategory; icon: string; title: string }[] = [
  { id: "uzlet", icon: "💼", title: "Üzlet/Vállalkozás" },
  { id: "onfejlesztes", icon: "🧠", title: "Önfejlesztés" },
  { id: "egeszseg", icon: "🏃", title: "Egészség/Fitness" },
  { id: "tech", icon: "💻", title: "Technológia" },
  { id: "penzugyek", icon: "💰", title: "Pénzügyek" },
  { id: "marketing", icon: "📢", title: "Marketing" },
  { id: "vezetes", icon: "👔", title: "Vezetés" },
  { id: "pszichologia", icon: "🧩", title: "Pszichológia" },
  { id: "oktatas", icon: "📖", title: "Oktatás" },
  { id: "lifestyle", icon: "🌿", title: "Lifestyle" },
];

export const TONES: { id: Tone; label: string; icon: string }[] = [
  { id: "light", label: "Könnyed", icon: "😊" },
  { id: "professional", label: "Professzionális", icon: "💼" },
  { id: "dramatic", label: "Drámai", icon: "🎭" },
  { id: "humorous", label: "Humoros", icon: "😄" },
  { id: "dark", label: "Sötét", icon: "🌑" },
];

export const BOOK_LENGTHS: { id: BookLength; label: string; words: string; chapters: string }[] = [
  { id: "short", label: "Rövid", words: "~30,000 szó", chapters: "8-10 fejezet" },
  { id: "medium", label: "Közepes", words: "~60,000 szó", chapters: "15-20 fejezet" },
  { id: "long", label: "Hosszú", words: "~100,000 szó", chapters: "25-35 fejezet" },
];
