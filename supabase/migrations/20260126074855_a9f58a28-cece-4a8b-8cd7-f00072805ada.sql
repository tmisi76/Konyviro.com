-- ============================================
-- PROJECTS TABLE: Add background writing tracking columns
-- ============================================

-- Update writing_status default value to 'idle'
ALTER TABLE public.projects 
ALTER COLUMN writing_status SET DEFAULT 'idle';

-- Add new columns for background writing tracking
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS writing_started_at timestamptz,
ADD COLUMN IF NOT EXISTS writing_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS current_chapter_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_scene_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS writing_error text,
ADD COLUMN IF NOT EXISTS total_scenes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_scenes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_scenes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- ============================================
-- CHAPTERS TABLE: Add chapter-level writing tracking
-- ============================================

ALTER TABLE public.chapters
ADD COLUMN IF NOT EXISTS writing_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS current_scene_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS scenes_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS writing_error text;

-- ============================================
-- INDEXES for efficient querying
-- ============================================

-- Index for finding projects by writing status (for job queue)
CREATE INDEX IF NOT EXISTS idx_projects_writing_status 
ON public.projects (writing_status);

-- Index for watchdog: finding stale projects
CREATE INDEX IF NOT EXISTS idx_projects_last_activity 
ON public.projects (last_activity_at) 
WHERE writing_status IN ('generating_outlines', 'writing', 'queued');

-- Index for chapters writing status
CREATE INDEX IF NOT EXISTS idx_chapters_writing_status 
ON public.chapters (writing_status);

-- Composite index for finding active chapters in a project
CREATE INDEX IF NOT EXISTS idx_chapters_project_writing 
ON public.chapters (project_id, writing_status);