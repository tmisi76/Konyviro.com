-- Create sources table for research management
CREATE TABLE public.sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  year INTEGER,
  url TEXT,
  source_type TEXT NOT NULL DEFAULT 'egyeb',
  notes TEXT,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  is_starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create citations table for tracking inline citations
CREATE TABLE public.citations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.blocks(id) ON DELETE SET NULL,
  citation_number INTEGER NOT NULL,
  page_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;

-- RLS policies for sources
CREATE POLICY "Users can view their own sources"
ON public.sources FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = sources.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create sources in their projects"
ON public.sources FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = sources.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update their own sources"
ON public.sources FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = sources.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own sources"
ON public.sources FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = sources.project_id
  AND projects.user_id = auth.uid()
));

-- RLS policies for citations
CREATE POLICY "Users can view their own citations"
ON public.citations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM chapters
  JOIN projects ON projects.id = chapters.project_id
  WHERE chapters.id = citations.chapter_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create citations in their chapters"
ON public.citations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM chapters
  JOIN projects ON projects.id = chapters.project_id
  WHERE chapters.id = citations.chapter_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update their own citations"
ON public.citations FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM chapters
  JOIN projects ON projects.id = chapters.project_id
  WHERE chapters.id = citations.chapter_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own citations"
ON public.citations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM chapters
  JOIN projects ON projects.id = chapters.project_id
  WHERE chapters.id = citations.chapter_id
  AND projects.user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_sources_updated_at
BEFORE UPDATE ON public.sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();