ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS regen_retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS cliche_counts JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS has_missing_chapters BOOLEAN NOT NULL DEFAULT false;