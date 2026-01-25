-- Create exports tracking table
CREATE TABLE public.exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('epub', 'pdf', 'mobi', 'docx')),
  settings JSONB DEFAULT '{}'::jsonb,
  file_url TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own exports"
  ON public.exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exports"
  ON public.exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exports"
  ON public.exports FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX idx_exports_user_month ON public.exports (user_id, created_at);
CREATE INDEX idx_exports_project ON public.exports (project_id);