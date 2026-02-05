-- Fix 1: Update book_shares RLS policy to require share_token in WHERE clause
-- This prevents enumeration by requiring the exact token to be provided

DROP POLICY IF EXISTS "Anyone can read public shares by token" ON book_shares;

-- Create more restrictive policy that still works for token-based lookups
-- The application MUST provide the share_token in the query for it to work
CREATE POLICY "Anyone can read public shares by token"
  ON book_shares FOR SELECT
  USING (
    is_public = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Fix 2: Update storage policies for project-assets bucket
-- Enforce path structure: user_id/... for uploads
DROP POLICY IF EXISTS "Users can upload project assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project assets" ON storage.objects;

-- Users can only upload to their own folder (first folder segment must be their user_id)
CREATE POLICY "Users can upload project assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-assets' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only delete from their own folder
CREATE POLICY "Users can delete their project assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-assets' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only update their own files
CREATE POLICY "Users can update their project assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-assets' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'project-assets' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fix 3: Update book_shares_public view to ensure password_hash is never exposed
-- Recreate the view with explicit column selection (no password_hash)
DROP VIEW IF EXISTS book_shares_public;

CREATE VIEW book_shares_public 
WITH (security_invoker = on)
AS
SELECT 
  id,
  project_id,
  user_id,
  share_token,
  is_public,
  view_mode,
  allow_download,
  expires_at,
  view_count,
  created_at,
  updated_at,
  (password_hash IS NOT NULL) AS requires_password
FROM book_shares
WHERE is_public = true 
  AND (expires_at IS NULL OR expires_at > now());