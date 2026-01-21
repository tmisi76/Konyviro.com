-- Add story generation columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS story_idea TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS generated_story TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS story_structure JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN projects.story_idea IS 'Original story idea from user';
COMMENT ON COLUMN projects.generated_story IS 'AI generated detailed story synopsis';
COMMENT ON COLUMN projects.story_structure IS 'Structured story data (characters, plot points, chapters)';