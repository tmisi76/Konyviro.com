-- 1. AI model task settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('ai_model_scene', '"google/gemini-3-pro-preview"'::jsonb, 'Jelenet- és fejezetírás modellje'),
  ('ai_model_structural', '"google/gemini-3-pro-preview"'::jsonb, 'Story, outline, karakter generálás modellje'),
  ('ai_model_lector', '"google/gemini-3-pro-preview"'::jsonb, 'Auto-lektor és refine modellje'),
  ('ai_model_quality', '"google/gemini-3-pro-preview"'::jsonb, 'Quality checker és audit modellje'),
  ('ai_model_fast', '"google/gemini-3-flash-preview"'::jsonb, 'Rövid összefoglalók, gyors taskok modellje'),
  ('ai_model_vision', '"google/gemini-2.5-flash"'::jsonb, 'Képelemzés modellje'),
  ('ai_pro_fallback_to_flash', 'true'::jsonb, 'Ha a Pro modell rate limitet kap, automatikus Flash fallback')
ON CONFLICT (key) DO NOTHING;

-- 2. Character status lock fields
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'alive' CHECK (status IN ('alive', 'dead', 'unknown', 'missing')),
  ADD COLUMN IF NOT EXISTS death_chapter INTEGER,
  ADD COLUMN IF NOT EXISTS death_scene_id UUID;

CREATE INDEX IF NOT EXISTS idx_characters_status ON public.characters(project_id, status);

-- 3. Bigram cliché tracker storage on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS bigram_counts JSONB DEFAULT '{}'::jsonb;