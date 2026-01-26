-- Create covers table for book cover designs
CREATE TABLE public.covers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  style TEXT NOT NULL,
  image_url TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  parent_cover_id UUID REFERENCES public.covers(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.covers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view covers for their projects"
  ON public.covers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = covers.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create covers for their projects"
  ON public.covers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = covers.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update covers for their projects"
  ON public.covers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = covers.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete covers for their projects"
  ON public.covers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = covers.project_id
    AND projects.user_id = auth.uid()
  ));

-- Index for faster lookups
CREATE INDEX idx_covers_project_id ON public.covers(project_id);
CREATE INDEX idx_covers_parent_id ON public.covers(parent_cover_id);