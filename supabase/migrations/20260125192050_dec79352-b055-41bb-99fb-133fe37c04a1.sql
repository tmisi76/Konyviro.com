-- Add book quality engine columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS book_type TEXT DEFAULT 'regeny',
ADD COLUMN IF NOT EXISTS writing_style TEXT,
ADD COLUMN IF NOT EXISTS audience_level TEXT DEFAULT 'kozepes',
ADD COLUMN IF NOT EXISTS story_arc JSONB DEFAULT '{}';

-- Add development arc to characters table for character growth tracking
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS development_arc JSONB DEFAULT '{}';

-- Add quality tracking to chapters table
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS quality_score INTEGER,
ADD COLUMN IF NOT EXISTS quality_issues JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tension_level TEXT DEFAULT 'medium';

-- Add comments for documentation
COMMENT ON COLUMN projects.book_type IS 'Type of book: regeny, szakmai, onfejleszto';
COMMENT ON COLUMN projects.writing_style IS 'Writing style: irodalmi, kortars, thriller, romantikus (fiction) or akademiai, gyakorlatias, coach, storytelling (nonfiction)';
COMMENT ON COLUMN projects.audience_level IS 'Target audience complexity: kezdo, kozepes, halado, szakerto';
COMMENT ON COLUMN projects.story_arc IS 'Dramaturgical arc configuration with act breaks and climax points';
COMMENT ON COLUMN characters.development_arc IS 'Character development arc: starting_state, wound, want, need, transformation';
COMMENT ON COLUMN chapters.quality_score IS 'AI-generated quality score 0-100';
COMMENT ON COLUMN chapters.quality_issues IS 'Array of identified quality issues';
COMMENT ON COLUMN chapters.tension_level IS 'Narrative tension level: low, medium, high, climax';