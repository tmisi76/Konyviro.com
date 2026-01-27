-- Add 'mesekonyv' to the genre constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_genre_check;

ALTER TABLE projects ADD CONSTRAINT projects_genre_check 
CHECK (genre = ANY (ARRAY['szakkönyv', 'szakkonyv', 'fiction', 'erotikus', 'mesekonyv']));