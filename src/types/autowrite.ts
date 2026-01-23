// Unified outline item - works for both fiction scenes and non-fiction sections
export interface SceneOutline {
  scene_number: number;
  title: string;
  pov: string; // For fiction: character POV, for non-fiction: section type (intro, concept, etc.)
  location: string; // For fiction: place, for non-fiction: section type label
  time: string;
  description: string;
  key_events: string[]; // For fiction: events, for non-fiction: key_points
  emotional_arc: string; // For fiction: emotional arc, for non-fiction: examples count
  target_words: number;
  status: "pending" | "writing" | "done" | "failed";
}

// Non-fiction section types
export type SectionType = "intro" | "concept" | "example" | "exercise" | "summary" | "case_study";

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  intro: "Bevezető",
  concept: "Fogalom",
  example: "Példa",
  exercise: "Gyakorlat",
  summary: "Összefoglaló",
  case_study: "Esettanulmány",
};

export interface AutoWriteProgress {
  totalScenes: number;
  completedScenes: number;
  totalWords: number;
  targetWords: number;
  currentChapterIndex: number;
  currentSceneIndex: number;
  status: "idle" | "generating_outline" | "writing" | "paused" | "completed" | "error";
  error?: string;
}

export interface ChapterWithScenes {
  id: string;
  title: string;
  sort_order: number;
  scene_outline: SceneOutline[];
  generation_status: "pending" | "generating" | "paused" | "completed";
  word_count: number;
}
