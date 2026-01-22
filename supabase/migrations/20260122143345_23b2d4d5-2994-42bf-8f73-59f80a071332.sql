-- Add profile fields for user customization
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS social_twitter TEXT,
ADD COLUMN IF NOT EXISTS social_instagram TEXT;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table for user writing samples (for style analysis)
CREATE TABLE IF NOT EXISTS user_writing_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on writing samples
ALTER TABLE user_writing_samples ENABLE ROW LEVEL SECURITY;

-- RLS policies for writing samples
CREATE POLICY "Users can view their own writing samples"
ON user_writing_samples FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own writing samples"
ON user_writing_samples FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own writing samples"
ON user_writing_samples FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own writing samples"
ON user_writing_samples FOR DELETE
USING (auth.uid() = user_id);

-- Create table for user style profile (AI-analyzed results)
CREATE TABLE IF NOT EXISTS user_style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_sentence_length NUMERIC,
  vocabulary_complexity NUMERIC,
  dialogue_ratio NUMERIC,
  common_phrases JSONB DEFAULT '[]'::jsonb,
  tone_analysis JSONB DEFAULT '{}'::jsonb,
  style_summary TEXT,
  samples_analyzed INTEGER DEFAULT 0,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on style profiles
ALTER TABLE user_style_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for style profiles
CREATE POLICY "Users can view their own style profile"
ON user_style_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own style profile"
ON user_style_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own style profile"
ON user_style_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Add updated_at trigger for new tables
CREATE TRIGGER update_user_writing_samples_updated_at
BEFORE UPDATE ON user_writing_samples
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_style_profiles_updated_at
BEFORE UPDATE ON user_style_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();