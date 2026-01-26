-- Add storybook_data column to projects table for storing storybook metadata
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS storybook_data JSONB DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN public.projects.storybook_data IS 'Stores storybook wizard data including theme, characters, pages, and illustration URLs';