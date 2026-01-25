-- Add character_appearances column for tracking what each character did in each chapter
ALTER TABLE chapters 
ADD COLUMN character_appearances JSONB DEFAULT '[]'::jsonb;