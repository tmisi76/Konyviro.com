-- Create chapters table
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Új fejezet',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blocks table
CREATE TABLE public.blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'paragraph' CHECK (type IN ('paragraph', 'heading1', 'heading2', 'heading3', 'bulletList', 'numberedList', 'quote', 'callout', 'divider', 'image')),
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- RLS for chapters (users can only access chapters of their own projects)
CREATE POLICY "Users can view their own chapters"
  ON public.chapters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = chapters.project_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create chapters in their projects"
  ON public.chapters FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = chapters.project_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own chapters"
  ON public.chapters FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = chapters.project_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own chapters"
  ON public.chapters FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = chapters.project_id 
    AND projects.user_id = auth.uid()
  ));

-- RLS for blocks (users can only access blocks of their own chapters)
CREATE POLICY "Users can view their own blocks"
  ON public.blocks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chapters
    JOIN public.projects ON projects.id = chapters.project_id
    WHERE chapters.id = blocks.chapter_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create blocks in their chapters"
  ON public.blocks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chapters
    JOIN public.projects ON projects.id = chapters.project_id
    WHERE chapters.id = blocks.chapter_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own blocks"
  ON public.blocks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.chapters
    JOIN public.projects ON projects.id = chapters.project_id
    WHERE chapters.id = blocks.chapter_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own blocks"
  ON public.blocks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.chapters
    JOIN public.projects ON projects.id = chapters.project_id
    WHERE chapters.id = blocks.chapter_id 
    AND projects.user_id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at
  BEFORE UPDATE ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();