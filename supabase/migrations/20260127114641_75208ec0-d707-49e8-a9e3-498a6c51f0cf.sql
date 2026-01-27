-- Fix writing_jobs RLS to restrict access to only project owners
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own project jobs" ON public.writing_jobs;
DROP POLICY IF EXISTS "Users can view jobs" ON public.writing_jobs;
DROP POLICY IF EXISTS "Anyone can view writing jobs" ON public.writing_jobs;

-- Create restrictive policy: users can only view jobs for their own projects
CREATE POLICY "Users can view their own project jobs"
ON public.writing_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = writing_jobs.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.writing_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting jobs (only for own projects)
DROP POLICY IF EXISTS "Users can create jobs for their projects" ON public.writing_jobs;
CREATE POLICY "Users can create jobs for their projects"
ON public.writing_jobs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = writing_jobs.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Create policy for updating jobs (only for own projects)
DROP POLICY IF EXISTS "Users can update their own project jobs" ON public.writing_jobs;
CREATE POLICY "Users can update their own project jobs"
ON public.writing_jobs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = writing_jobs.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Create policy for deleting jobs (only for own projects)
DROP POLICY IF EXISTS "Users can delete their own project jobs" ON public.writing_jobs;
CREATE POLICY "Users can delete their own project jobs"
ON public.writing_jobs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = writing_jobs.project_id
    AND projects.user_id = auth.uid()
  )
);