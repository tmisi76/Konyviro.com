export interface WritingSession {
  id: string;
  user_id: string;
  project_id: string | null;
  words_written: number;
  ai_words_generated: number;
  duration_seconds: number;
  session_date: string;
  created_at: string;
}

export interface UserGoals {
  id: string;
  user_id: string;
  daily_word_goal: number;
  reminder_enabled: boolean;
  reminder_time: string | null;
  leaderboard_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_writing_date: string | null;
  streak_recovery_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: "words" | "streak" | "chapters" | "books";
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_chapter",
    name: "Első fejezet",
    description: "Fejezd be az első fejezetet",
    icon: "📖",
    requirement: 1,
    type: "chapters",
  },
  {
    id: "words_10k",
    name: "10.000 szó",
    description: "Írj 10.000 szót összesen",
    icon: "✍️",
    requirement: 10000,
    type: "words",
  },
  {
    id: "words_50k",
    name: "50.000 szó",
    description: "Írj 50.000 szót összesen",
    icon: "📝",
    requirement: 50000,
    type: "words",
  },
  {
    id: "words_100k",
    name: "100.000 szó",
    description: "Írj 100.000 szót összesen",
    icon: "🏆",
    requirement: 100000,
    type: "words",
  },
  {
    id: "streak_7",
    name: "Heti rutin",
    description: "7 napos írás sorozat",
    icon: "🔥",
    requirement: 7,
    type: "streak",
  },
  {
    id: "streak_30",
    name: "Fájdalommentes",
    description: "30 napos írás sorozat",
    icon: "💪",
    requirement: 30,
    type: "streak",
  },
  {
    id: "streak_100",
    name: "Kitartó író",
    description: "100 napos írás sorozat",
    icon: "🌟",
    requirement: 100,
    type: "streak",
  },
  {
    id: "first_book",
    name: "Első könyv",
    description: "Fejezz be egy könyvet",
    icon: "📚",
    requirement: 1,
    type: "books",
  },
];

export interface DailyStats {
  date: string;
  words: number;
  aiWords: number;
}

export interface WeeklyStats {
  week: string;
  words: number;
  aiWords: number;
  avgPerDay: number;
}

export interface ProjectStats {
  progress: number;
  estimatedCompletionDate: Date | null;
  totalTimeSpent: number;
  aiRatio: number;
}
