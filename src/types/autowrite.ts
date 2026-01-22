export interface SceneOutline {
  scene_number: number;
  title: string;
  pov: string;
  location: string;
  time: string;
  description: string;
  key_events: string[];
  emotional_arc: string;
  target_words: number;
  status: "pending" | "writing" | "done";
}

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
