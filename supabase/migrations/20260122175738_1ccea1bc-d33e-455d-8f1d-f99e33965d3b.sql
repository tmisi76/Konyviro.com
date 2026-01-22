-- Drop the old genre constraint that requires accented 'szakkönyv'
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_genre_check;

-- Add new constraint that accepts both accented and non-accented versions
ALTER TABLE projects ADD CONSTRAINT projects_genre_check 
CHECK (genre = ANY (ARRAY['szakkönyv', 'szakkonyv', 'fiction', 'erotikus']));