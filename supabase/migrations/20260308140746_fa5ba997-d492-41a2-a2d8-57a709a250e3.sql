
-- Chapter versions for snapshot/restore
CREATE TABLE public.chapter_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  content TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.chapter_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chapter versions"
  ON public.chapter_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.projects p ON p.id = c.project_id
      WHERE c.id = chapter_versions.chapter_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create own chapter versions"
  ON public.chapter_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.projects p ON p.id = c.project_id
      WHERE c.id = chapter_versions.chapter_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own chapter versions"
  ON public.chapter_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.projects p ON p.id = c.project_id
      WHERE c.id = chapter_versions.chapter_id AND p.user_id = auth.uid()
    )
  );

-- Glossary terms
CREATE TABLE public.glossary_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT,
  aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own glossary terms"
  ON public.glossary_terms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = glossary_terms.project_id AND p.user_id = auth.uid()
    )
  );

-- Project collaborators
CREATE TABLE public.project_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'reader',
  invited_by UUID REFERENCES auth.users(id),
  invited_email TEXT,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, user_id)
);
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project owners can manage collaborators"
  ON public.project_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = project_collaborators.project_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "Collaborators can view their own entries"
  ON public.project_collaborators FOR SELECT
  USING (user_id = auth.uid());

-- Published books for gallery
CREATE TABLE public.published_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  cover_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);
ALTER TABLE public.published_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published books"
  ON public.published_books FOR SELECT USING (true);
CREATE POLICY "Users can manage own published books"
  ON public.published_books FOR ALL
  USING (user_id = auth.uid());

-- Drip campaigns for onboarding
CREATE TABLE public.drip_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + interval '1 day',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.drip_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage drip campaigns"
  ON public.drip_campaigns FOR ALL
  USING (true);

CREATE INDEX idx_chapter_versions_chapter_id ON public.chapter_versions(chapter_id);
CREATE INDEX idx_glossary_terms_project_id ON public.glossary_terms(project_id);
CREATE INDEX idx_project_collaborators_user_id ON public.project_collaborators(user_id);
CREATE INDEX idx_published_books_genre ON public.published_books(genre);
CREATE INDEX idx_drip_campaigns_next_send ON public.drip_campaigns(next_send_at) WHERE status = 'pending';
