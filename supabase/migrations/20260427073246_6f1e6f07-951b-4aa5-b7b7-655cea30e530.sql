-- Új tábla: raw_sources (a felhasználó által feltöltött nyersanyagok szakkönyvhez)
CREATE TABLE public.raw_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('text', 'file', 'url')),
  original_filename TEXT,
  storage_path TEXT,
  source_url TEXT,
  title TEXT,
  extracted_text TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  topic_cluster TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_sources_project ON public.raw_sources(project_id);
CREATE INDEX idx_raw_sources_status ON public.raw_sources(status);

ALTER TABLE public.raw_sources ENABLE ROW LEVEL SECURITY;

-- RLS: csak a projekt tulajdonosa férhet hozzá
CREATE POLICY "Users can view their own raw sources"
ON public.raw_sources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = raw_sources.project_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create raw sources for their projects"
ON public.raw_sources
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = raw_sources.project_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own raw sources"
ON public.raw_sources
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = raw_sources.project_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own raw sources"
ON public.raw_sources
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = raw_sources.project_id AND p.user_id = auth.uid()
  )
);

-- Trigger az updated_at frissítéséhez
CREATE TRIGGER update_raw_sources_updated_at
BEFORE UPDATE ON public.raw_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();