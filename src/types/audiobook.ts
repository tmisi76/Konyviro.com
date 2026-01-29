export interface TTSVoice {
  id: string;
  elevenlabs_voice_id: string;
  name: string;
  description: string | null;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  sample_text: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Audiobook {
  id: string;
  project_id: string;
  user_id: string;
  voice_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total_chapters: number;
  completed_chapters: number;
  audio_url: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  // Joined fields
  voice?: TTSVoice;
}

export interface AudiobookChapter {
  id: string;
  audiobook_id: string;
  chapter_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audio_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  error_message: string | null;
  created_at: string;
  // Joined fields
  chapter?: {
    id: string;
    title: string;
    word_count: number;
  };
}

export interface CreateAudiobookInput {
  project_id: string;
  voice_id: string;
}

export interface VoicePreviewRequest {
  elevenlabs_voice_id: string;
  sample_text: string;
}
