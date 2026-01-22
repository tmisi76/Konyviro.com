-- Add author_profile column for non-fiction books
ALTER TABLE projects ADD COLUMN IF NOT EXISTS author_profile jsonb DEFAULT NULL;

-- Add comment to explain the structure
COMMENT ON COLUMN projects.author_profile IS 'Author profile for non-fiction books: {authorName, formality, authorBackground, personalStories, mainPromise}';