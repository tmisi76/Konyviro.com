-- Add new columns for the 7-step book creation wizard
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS additional_instructions TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS selected_story_idea JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS wizard_step INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS writing_status TEXT DEFAULT 'draft';

-- Add comment for documentation
COMMENT ON COLUMN projects.subcategory IS 'Subcategory within genre (e.g., thriller, romance, business)';
COMMENT ON COLUMN projects.additional_instructions IS 'Free-form user instructions for AI';
COMMENT ON COLUMN projects.selected_story_idea IS 'The AI-generated story idea the user selected';
COMMENT ON COLUMN projects.wizard_step IS 'Current step in the 7-step wizard (1-7)';
COMMENT ON COLUMN projects.writing_status IS 'Writing status: draft, in_progress, paused, completed';