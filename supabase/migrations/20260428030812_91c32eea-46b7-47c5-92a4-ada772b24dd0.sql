ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS recurring_names jsonb NOT NULL DEFAULT '{}'::jsonb;