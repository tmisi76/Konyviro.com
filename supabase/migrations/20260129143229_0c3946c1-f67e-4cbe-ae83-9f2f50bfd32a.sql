-- =========================================
-- Book Sharing & Audiobook Tables
-- =========================================

-- 1. Book Shares Table (for sharing books publicly or with password)
CREATE TABLE public.book_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  password_hash TEXT,
  view_mode TEXT DEFAULT 'scroll' CHECK (view_mode IN ('flipbook', 'scroll')),
  allow_download BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.book_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for book_shares
CREATE POLICY "Users can manage their own shares"
ON public.book_shares
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read public shares by token"
ON public.book_shares
FOR SELECT
USING (
  is_public = true 
  AND (expires_at IS NULL OR expires_at > now())
);

-- 2. TTS Voices Table (Admin managed)
CREATE TABLE public.tts_voices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elevenlabs_voice_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  gender TEXT DEFAULT 'neutral' CHECK (gender IN ('male', 'female', 'neutral')),
  language TEXT DEFAULT 'hu',
  sample_text TEXT DEFAULT 'Ez egy minta szöveg a hang kipróbálásához.',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tts_voices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tts_voices
CREATE POLICY "Anyone can read active voices"
ON public.tts_voices
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage voices"
ON public.tts_voices
FOR ALL
USING (is_admin(auth.uid()));

-- Insert the provided voice IDs
INSERT INTO public.tts_voices (elevenlabs_voice_id, name, description, gender, language, sort_order) VALUES
  ('NOpBlnGInO9m6vDvFkFC', 'Narrátor 1', 'Magyar férfi hang', 'male', 'hu', 1),
  ('IRHApOXLvnW57QJPQH2P', 'Narrátor 2', 'Magyar női hang', 'female', 'hu', 2),
  ('xjlfQQ3ynqiEyRpArrT8', 'Narrátor 3', 'Magyar semleges hang', 'neutral', 'hu', 3),
  ('XfNU2rGpBa01ckF309OY', 'Narrátor 4', 'Magyar hang', 'neutral', 'hu', 4);

-- 3. Audiobooks Table
CREATE TABLE public.audiobooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  voice_id UUID REFERENCES public.tts_voices(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  completed_chapters INTEGER DEFAULT 0,
  audio_url TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.audiobooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audiobooks
CREATE POLICY "Users can manage their own audiobooks"
ON public.audiobooks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all audiobooks"
ON public.audiobooks
FOR SELECT
USING (is_admin(auth.uid()));

-- 4. Audiobook Chapters Table
CREATE TABLE public.audiobook_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audiobook_id UUID REFERENCES public.audiobooks(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  audio_url TEXT,
  duration_seconds INTEGER,
  sort_order INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audiobook_chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audiobook_chapters
CREATE POLICY "Users can view their own audiobook chapters"
ON public.audiobook_chapters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.audiobooks
    WHERE audiobooks.id = audiobook_chapters.audiobook_id
    AND audiobooks.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage audiobook chapters"
ON public.audiobook_chapters
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Create audiobooks storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audiobooks', 'audiobooks', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audiobooks bucket
CREATE POLICY "Users can view their own audiobook files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audiobooks' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role can manage audiobook files"
ON storage.objects
FOR ALL
USING (bucket_id = 'audiobooks')
WITH CHECK (bucket_id = 'audiobooks');

-- Add indexes for performance
CREATE INDEX idx_book_shares_token ON public.book_shares(share_token);
CREATE INDEX idx_book_shares_project ON public.book_shares(project_id);
CREATE INDEX idx_audiobooks_project ON public.audiobooks(project_id);
CREATE INDEX idx_audiobooks_status ON public.audiobooks(status);
CREATE INDEX idx_audiobook_chapters_audiobook ON public.audiobook_chapters(audiobook_id);