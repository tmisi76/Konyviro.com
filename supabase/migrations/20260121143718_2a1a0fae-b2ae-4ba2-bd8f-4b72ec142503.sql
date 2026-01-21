-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT NOT NULL CHECK (genre IN ('szakkönyv', 'fiction', 'erotikus')),
  target_audience TEXT CHECK (target_audience IN ('beginner', 'intermediate', 'expert', 'general')),
  target_word_count INTEGER NOT NULL DEFAULT 50000,
  word_count INTEGER NOT NULL DEFAULT 0,
  tone TEXT CHECK (tone IN ('formal', 'direct', 'friendly', 'provocative')),
  complexity INTEGER DEFAULT 50 CHECK (complexity >= 0 AND complexity <= 100),
  style_descriptive BOOLEAN DEFAULT false,
  style_dialogue BOOLEAN DEFAULT false,
  style_action BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();