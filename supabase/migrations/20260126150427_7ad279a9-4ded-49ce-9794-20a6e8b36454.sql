-- Add character_voice field to characters table
ALTER TABLE public.characters
ADD COLUMN character_voice TEXT DEFAULT NULL;