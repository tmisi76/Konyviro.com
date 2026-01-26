-- ============================================
-- WRITING JOBS TABLE - Job Queue for Background Processing
-- ============================================

CREATE TABLE IF NOT EXISTS public.writing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  
  -- Job típus és állapot
  job_type TEXT NOT NULL CHECK (job_type IN ('generate_outline', 'write_scene', 'generate_summary')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'paused')),
  
  -- Scene információk (write_scene típusnál)
  scene_index INTEGER,
  scene_outline JSONB,
  
  -- Prioritás és sorrend
  priority INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  
  -- Retry logika
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 15,
  last_error TEXT,
  
  -- Időbélyegek
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Lock a párhuzamos feldolgozás elkerülésére
  locked_by TEXT,
  locked_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.writing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own jobs, system can manage all
CREATE POLICY "Users can view their own writing jobs"
ON public.writing_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = writing_jobs.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create writing jobs for their projects"
ON public.writing_jobs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = writing_jobs.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own writing jobs"
ON public.writing_jobs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = writing_jobs.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own writing jobs"
ON public.writing_jobs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = writing_jobs.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Indexek a gyors lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_writing_jobs_pending 
ON public.writing_jobs(status, next_retry_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_writing_jobs_project 
ON public.writing_jobs(project_id, status);

CREATE INDEX IF NOT EXISTS idx_writing_jobs_processing 
ON public.writing_jobs(status, locked_at) 
WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_writing_jobs_chapter 
ON public.writing_jobs(chapter_id, sort_order);

-- Enable realtime for writing_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.writing_jobs;