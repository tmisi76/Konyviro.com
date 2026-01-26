-- Create quality_issues table for storing chapter quality analysis results
CREATE TABLE public.quality_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  location_text TEXT,
  description TEXT NOT NULL,
  suggestion TEXT
);

-- Enable Row Level Security
ALTER TABLE public.quality_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access quality issues for their own chapters
CREATE POLICY "Users can view quality issues for their chapters"
ON public.quality_issues
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chapters
    JOIN projects ON projects.id = chapters.project_id
    WHERE chapters.id = quality_issues.chapter_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create quality issues for their chapters"
ON public.quality_issues
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chapters
    JOIN projects ON projects.id = chapters.project_id
    WHERE chapters.id = quality_issues.chapter_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete quality issues for their chapters"
ON public.quality_issues
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM chapters
    JOIN projects ON projects.id = chapters.project_id
    WHERE chapters.id = quality_issues.chapter_id
    AND projects.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_quality_issues_chapter_id ON public.quality_issues(chapter_id);