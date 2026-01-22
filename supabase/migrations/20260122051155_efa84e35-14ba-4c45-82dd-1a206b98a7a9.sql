-- Add scene_outline column to chapters table for detailed scene-level structure
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS scene_outline JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.chapters.scene_outline IS 'JSON array of scene outlines: [{scene_number, title, pov, location, time, description, key_events, emotional_arc, target_words, status}]';

-- Add generation_status column to track automatic writing progress
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending';

-- Add comment for generation_status
COMMENT ON COLUMN public.chapters.generation_status IS 'Status of automatic generation: pending, generating, paused, completed';