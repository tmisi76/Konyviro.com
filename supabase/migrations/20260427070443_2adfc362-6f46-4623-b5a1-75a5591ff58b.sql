
-- Book series management tables
CREATE TABLE public.series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  bible JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own series"
  ON public.series FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own series"
  ON public.series FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own series"
  ON public.series FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own series"
  ON public.series FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_series_updated_at
  BEFORE UPDATE ON public.series
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add series link to projects
ALTER TABLE public.projects
  ADD COLUMN series_id UUID,
  ADD COLUMN series_volume_number INTEGER;

CREATE INDEX idx_projects_series_id ON public.projects(series_id);

-- Series-level characters (canonical, persistent across volumes)
CREATE TABLE public.series_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}'::text[],
  canonical_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- appearance, traits, voice, backstory
  first_volume INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.series_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own series characters"
  ON public.series_characters FOR ALL
  USING (EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_characters.series_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_characters.series_id AND s.user_id = auth.uid()));

CREATE TRIGGER update_series_characters_updated_at
  BEFORE UPDATE ON public.series_characters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_series_characters_series_id ON public.series_characters(series_id);

-- Per-volume character arcs / state
CREATE TABLE public.series_character_arcs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  series_character_id UUID NOT NULL REFERENCES public.series_characters(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  volume_number INTEGER NOT NULL,
  arc_summary TEXT,
  state_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.series_character_arcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own series character arcs"
  ON public.series_character_arcs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.series_characters sc
    JOIN public.series s ON s.id = sc.series_id
    WHERE sc.id = series_character_arcs.series_character_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.series_characters sc
    JOIN public.series s ON s.id = sc.series_id
    WHERE sc.id = series_character_arcs.series_character_id AND s.user_id = auth.uid()
  ));

CREATE INDEX idx_series_character_arcs_character_id ON public.series_character_arcs(series_character_id);
CREATE INDEX idx_series_character_arcs_project_id ON public.series_character_arcs(project_id);

-- Timeline events per volume
CREATE TABLE public.series_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  project_id UUID,
  volume_number INTEGER,
  chapter_id UUID,
  event_title TEXT NOT NULL,
  event_description TEXT,
  involved_characters TEXT[] DEFAULT '{}'::text[],
  importance TEXT NOT NULL DEFAULT 'medium', -- low / medium / high / critical
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.series_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own series events"
  ON public.series_events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_events.series_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_events.series_id AND s.user_id = auth.uid()));

CREATE INDEX idx_series_events_series_id ON public.series_events(series_id);

-- Consistency warnings
CREATE TABLE public.series_consistency_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  chapter_id UUID,
  warning_type TEXT NOT NULL, -- 'character' | 'plot' | 'location' | 'timeline' | 'world_rule'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high'
  description TEXT NOT NULL,
  suggestion TEXT,
  excerpt TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- 'new' | 'accepted' | 'fixed' | 'ignored'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.series_consistency_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own series warnings"
  ON public.series_consistency_warnings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_consistency_warnings.series_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_consistency_warnings.series_id AND s.user_id = auth.uid()));

CREATE TRIGGER update_series_warnings_updated_at
  BEFORE UPDATE ON public.series_consistency_warnings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_series_warnings_series_id ON public.series_consistency_warnings(series_id);
CREATE INDEX idx_series_warnings_project_id ON public.series_consistency_warnings(project_id);
CREATE INDEX idx_series_warnings_status ON public.series_consistency_warnings(status);
