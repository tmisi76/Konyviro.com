-- Kutatási dossier-ek táblája oknyomozó könyvekhez
CREATE TABLE public.project_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  case_reference TEXT NOT NULL,
  extra_instructions TEXT,
  research_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_research_project_id ON public.project_research(project_id);

ALTER TABLE public.project_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their project research"
ON public.project_research
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_research.project_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can insert project research"
ON public.project_research
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_research.project_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update project research"
ON public.project_research
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_research.project_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete project research"
ON public.project_research
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_research.project_id
    AND p.user_id = auth.uid()
  )
);

CREATE TRIGGER update_project_research_updated_at
BEFORE UPDATE ON public.project_research
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();