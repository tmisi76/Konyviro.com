// Wizard step types and interfaces

export type Genre = "szakkonyv" | "fiction" | "mesekonyv";

// Non-fiction book types
export type NonfictionBookType = 
  | "how-to" 
  | "thought-leadership" 
  | "case-study" 
  | "framework" 
  | "self-help" 
  | "storytelling-business" 
  | "interview" 
  | "workbook" 
  | "reference" 
  | "memoir"
  | "investigative";

export interface NonfictionBookTypeInfo {
  id: NonfictionBookType;
  icon: string;
  title: string;
  description: string;
  example: string;
}

export const NONFICTION_BOOK_TYPES: NonfictionBookTypeInfo[] = [
  { id: "how-to", icon: "📘", title: "How-To Útmutató", description: "Lépésről lépésre tanít egy konkrét skillt", example: "Facebook hirdetések alapjai, Excel tippek" },
  { id: "thought-leadership", icon: "💡", title: "Thought Leadership", description: "Új szemléletet, gondolkodásmódot ad", example: "Start With Why, A kék óceán stratégia" },
  { id: "case-study", icon: "📊", title: "Esettanulmány alapú", description: "Sikertörténetekből von le tanulságokat", example: "Good to Great, A milliárdos kódja" },
  { id: "framework", icon: "🔧", title: "Framework / Módszertan", description: "Egy komplett rendszert/keretrendszert tanít", example: "Lean Startup, Getting Things Done" },
  { id: "self-help", icon: "🧠", title: "Önfejlesztő", description: "Személyes változást, szokásokat épít", example: "Atomic Habits, Az 5 szeretetnyelv" },
  { id: "storytelling-business", icon: "📖", title: "Storytelling üzleti", description: "Történetbe ágyazott üzleti tanítás", example: "A cél (The Goal), Ki vitte el a sajtomat" },
  { id: "interview", icon: "🎤", title: "Interjú / Beszélgetések", description: "Szakértők bölcsességeinek gyűjteménye", example: "Tools of Titans, Tribe of Mentors" },
  { id: "workbook", icon: "✍️", title: "Workbook / Munkafüzet", description: "Gyakorlatok, feladatok, kitöltős részek", example: "The Artist's Way, Tervezd meg az életed" },
  { id: "reference", icon: "📚", title: "Kézikönyv / Referencia", description: "Átfogó tudástár, amit újra elővehetnek", example: "Marketing kézikönyv, HR vezető kézikönyve" },
  { id: "memoir", icon: "🎬", title: "Memoir + Tanulságok", description: "Személyes vállalkozói történet leckékkel", example: "Shoe Dog, Az Amazon története" },
  { id: "investigative", icon: "🔍", title: "Oknyomozó", description: "Valós ügyek feltárása bizonyítékokkal, dokumentumfilm-szerű stílusban", example: "All the President's Men, Feltárt igazságok" },
];

// Type-specific data interfaces
export interface BookTypeSpecificData {
  // How-To
  skillOutcome?: string;
  audienceLevel?: "beginner" | "intermediate" | "advanced";
  prerequisites?: string;
  bookDepth?: "quick" | "comprehensive" | "full-course";
  
  // Thought Leadership
  bigIdea?: string;
  currentProblem?: string;
  leadershipTone?: "provocative" | "inspiring" | "scientific";
  
  // Case Study
  caseStudyCount?: "3-5" | "6-10" | "10+";
  storyTypes?: "success" | "mixed" | "turnaround";
  industryFocus?: string;
  thesisToProve?: string;
  
  // Framework
  methodologyName?: string;
  elementCount?: 3 | 4 | 5 | 6;
  frameworkElements?: string[];
  problemSolved?: string;
  
  // Self-Help
  promisedChange?: string;
  obstacleToOvercome?: string;
  exerciseFrequency?: "every-chapter" | "some" | "theory-focused";
  programTimeframe?: "7-day" | "30-day" | "90-day" | "none";
  
  // Storytelling Business
  protagonistType?: "fictional" | "self" | "real-anonymous";
  startingSituation?: string;
  mainTransformation?: string;
  storyTone?: "inspiring" | "dramatic" | "humorous";
  
  // Interview
  expertCount?: "5-10" | "10-20" | "20+";
  expertType?: "real" | "ai-generated";
  unifyingTheme?: string;
  recurringQuestions?: string[];
  
  // Workbook
  workbookGoal?: string;
  moduleCount?: "5-7" | "8-12" | "12+";
  exerciseTypes?: string[];
  processingTimeframe?: "1-week" | "30-day" | "self-paced";
  
  // Reference
  coverageArea?: string;
  referenceAudience?: "beginners" | "professionals" | "both";
  referenceStructure?: "a-z" | "thematic" | "problem-based";
  referenceLength?: "short" | "medium" | "comprehensive";
  
  // Memoir
  timePeriod?: string;
  turningPoints?: string[];
  mainLesson?: string;
  memoirTone?: "raw" | "inspiring" | "humorous";
  
  // Investigative
  investigationSubject?: string;
  investigationScope?: "individual" | "organization" | "system" | "event";
  evidenceTypes?: string[];
  investigatorRole?: "first-person" | "third-person" | "team";
  timelinePeriod?: string;
  keyPlayers?: string;
  centralQuestion?: string;
  investigationTone?: "factual" | "dramatic" | "sardonic" | "urgent";
  // Investigative – valós ügy kutatás (Perplexity)
  realCaseReference?: string;
  extraResearchInstructions?: string;
}

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
  | "lifestyle"
  | "politika"
  | "tarsadalom"
  | "tortenelem"
  | "bunugy";

export type Subcategory = FictionSubcategory | NonfictionSubcategory;

export type Tone = "light" | "professional" | "dramatic" | "humorous" | "dark" | "suspenseful" | "inspiring";

export type BookLength = number; // 1000-50000 szó

export type WritingStatus = "draft" | "in_progress" | "paused" | "completed";

// POV (Point of View) type for fiction
export type POVType = "first_person" | "third_limited" | "third_omniscient" | "multiple";

export const POV_OPTIONS: { id: POVType; label: string; description: string }[] = [
  { id: "first_person", label: "Első személy", description: "Én-elbeszélő - közvetlenebb, intim hangvétel" },
  { id: "third_limited", label: "Harmadik (korlátozott)", description: "Egy karakter szemszögéből" },
  { id: "third_omniscient", label: "Harmadik (mindentudó)", description: "Minden karakter gondolatait látjuk" },
  { id: "multiple", label: "Váltakozó nézőpont", description: "Több karakter POV-ja fejezetenként" },
];

// Pace type for fiction
export type PaceType = "slow" | "moderate" | "fast" | "variable";

export const PACE_OPTIONS: { id: PaceType; label: string; description: string }[] = [
  { id: "slow", label: "Lassú", description: "Részletes leírások, atmoszféra" },
  { id: "moderate", label: "Közepes", description: "Kiegyensúlyozott ritmus" },
  { id: "fast", label: "Gyors", description: "Akciódús, dinamikus" },
  { id: "variable", label: "Változó", description: "Feszültséghez igazodó tempó" },
];

// Dialogue ratio type
export type DialogueRatio = "minimal" | "balanced" | "heavy";

export const DIALOGUE_OPTIONS: { id: DialogueRatio; label: string; description: string }[] = [
  { id: "minimal", label: "Kevés", description: "Főleg narráció és leírás" },
  { id: "balanced", label: "Kiegyensúlyozott", description: "Természetes arány" },
  { id: "heavy", label: "Sok", description: "Párbeszéd-központú" },
];

// Description level type
export type DescriptionLevel = "sparse" | "moderate" | "rich";

export const DESCRIPTION_OPTIONS: { id: DescriptionLevel; label: string; description: string }[] = [
  { id: "sparse", label: "Minimális", description: "Akció és párbeszéd fókusz" },
  { id: "moderate", label: "Közepes", description: "Kulcsjelenetek részletezve" },
  { id: "rich", label: "Gazdag", description: "Érzékletes, atmoszférikus" },
];

// Age rating type
export type AgeRating = "all_ages" | "teen" | "adult" | "explicit";

export const AGE_RATING_OPTIONS: { id: AgeRating; label: string; description: string }[] = [
  { id: "all_ages", label: "Minden korosztály", description: "Családbarát tartalom" },
  { id: "teen", label: "16+", description: "Tinédzser és felnőtt" },
  { id: "adult", label: "18+", description: "Felnőtt tartalom" },
  { id: "explicit", label: "Explicit", description: "Részletes felnőtt tartalom" },
];

// Character nationality / naming convention
export type CharacterNationality =
  | "ai_choose"
  | "hungarian"
  | "english"
  | "american"
  | "german"
  | "french"
  | "spanish"
  | "italian"
  | "scandinavian"
  | "japanese"
  | "russian"
  | "mixed"
  | "fantasy";

export const NATIONALITY_OPTIONS: { id: CharacterNationality; label: string; flag: string }[] = [
  { id: "ai_choose",    label: "AI döntse el (helyszín alapján)", flag: "✨" },
  { id: "hungarian",    label: "Magyar (pl. Kovács János)",       flag: "🇭🇺" },
  { id: "english",      label: "Angol (pl. John Smith)",          flag: "🇬🇧" },
  { id: "american",     label: "Amerikai",                         flag: "🇺🇸" },
  { id: "german",       label: "Német",                            flag: "🇩🇪" },
  { id: "french",       label: "Francia",                          flag: "🇫🇷" },
  { id: "spanish",      label: "Spanyol / Latin",                  flag: "🇪🇸" },
  { id: "italian",      label: "Olasz",                            flag: "🇮🇹" },
  { id: "scandinavian", label: "Skandináv",                        flag: "🇸🇪" },
  { id: "japanese",     label: "Japán",                            flag: "🇯🇵" },
  { id: "russian",      label: "Orosz",                            flag: "🇷🇺" },
  { id: "mixed",        label: "Vegyes nemzetközi",                flag: "🌍" },
  { id: "fantasy",      label: "Fantasy / kitalált",               flag: "🐉" },
];

// Fiction style settings interface
export interface FictionStyleSettings {
  pov: POVType;
  pace: PaceType;
  dialogueRatio: DialogueRatio;
  descriptionLevel: DescriptionLevel;
  setting: string; // Helyszín/korszak szabad szöveg
  ageRating: AgeRating;
  characterNationality: CharacterNationality;
}

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
  // Non-fiction specific book type (9 step flow)
  nonfictionBookType: NonfictionBookType | null;
  bookTypeSpecificData: BookTypeSpecificData | null;
  title: string;
  storyDescription: string;
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
  // Fiction specific
  fictionStyle: FictionStyleSettings | null;
  // Estimated writing time from wizard
  estimatedWritingMinutes: number | null;
}

export const INITIAL_WIZARD_DATA: WizardData = {
  genre: null,
  subcategory: null,
  nonfictionBookType: null,
  bookTypeSpecificData: null,
  title: "",
  storyDescription: "",
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
  fictionStyle: null,
  estimatedWritingMinutes: null,
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
  { id: "politika", icon: "🏛️", title: "Politika/Közélet" },
  { id: "tarsadalom", icon: "👥", title: "Társadalom" },
  { id: "tortenelem", icon: "📜", title: "Történelem" },
  { id: "bunugy", icon: "🔍", title: "Bűnügy/True Crime" },
];

export const TONES: { id: Tone; label: string; icon: string }[] = [
  { id: "light", label: "Könnyed", icon: "😊" },
  { id: "professional", label: "Professzionális", icon: "💼" },
  { id: "dramatic", label: "Drámai", icon: "🎭" },
  { id: "humorous", label: "Humoros", icon: "😄" },
  { id: "dark", label: "Sötét", icon: "🌑" },
  { id: "suspenseful", label: "Feszült", icon: "⚡" },
  { id: "inspiring", label: "Inspiráló", icon: "✨" },
];

export const BOOK_LENGTH_PRESETS = [
  { value: 10000, label: "Novella" },
  { value: 25000, label: "Kisregény" },
  { value: 50000, label: "Regény" },
];
