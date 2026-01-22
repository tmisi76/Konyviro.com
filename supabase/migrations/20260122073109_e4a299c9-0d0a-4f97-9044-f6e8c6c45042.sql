-- Remove the tone CHECK constraint that prevents wizard values from being saved
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_tone_check;