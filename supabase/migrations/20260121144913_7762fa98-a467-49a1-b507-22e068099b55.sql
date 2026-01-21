-- Add status, summary, and key_points to chapters table
ALTER TABLE public.chapters
ADD COLUMN status text NOT NULL DEFAULT 'draft',
ADD COLUMN summary text,
ADD COLUMN key_points text[] DEFAULT '{}',
ADD COLUMN word_count integer NOT NULL DEFAULT 0;

-- Add comment explaining status values
COMMENT ON COLUMN public.chapters.status IS 'Chapter status: draft, in_progress, done';