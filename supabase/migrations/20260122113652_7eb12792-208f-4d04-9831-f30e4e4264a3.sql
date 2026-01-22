-- Add columns for background writing mode
ALTER TABLE projects ADD COLUMN IF NOT EXISTS writing_mode text DEFAULT null;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS background_started_at timestamptz DEFAULT null;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS background_error text DEFAULT null;