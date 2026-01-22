-- Add fiction_style column to projects table for storing fiction-specific settings
ALTER TABLE projects 
ADD COLUMN fiction_style jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.fiction_style IS 'Fiction-specific style settings: pov, pace, dialogueRatio, descriptionLevel, setting, ageRating';