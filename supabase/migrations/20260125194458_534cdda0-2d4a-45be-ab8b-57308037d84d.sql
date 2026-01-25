-- Add nonfiction book type columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS nonfiction_book_type TEXT,
ADD COLUMN IF NOT EXISTS book_type_data JSONB DEFAULT '{}';

-- Add check constraint for valid book types
ALTER TABLE projects 
ADD CONSTRAINT projects_nonfiction_book_type_check 
CHECK (nonfiction_book_type IS NULL OR nonfiction_book_type IN (
  'how-to', 
  'thought-leadership', 
  'case-study', 
  'framework', 
  'self-help', 
  'storytelling-business', 
  'interview', 
  'workbook', 
  'reference', 
  'memoir'
));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_nonfiction_book_type 
ON projects(nonfiction_book_type) 
WHERE nonfiction_book_type IS NOT NULL;