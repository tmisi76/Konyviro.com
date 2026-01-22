-- Remove the target_audience CHECK constraint to allow free-text input
ALTER TABLE public.projects 
DROP CONSTRAINT projects_target_audience_check;