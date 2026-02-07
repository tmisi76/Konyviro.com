-- Fix the SECURITY DEFINER view issue
-- Recreate the view with SECURITY INVOKER to respect RLS of the querying user
DROP VIEW IF EXISTS public.book_shares_public;

-- Create view with SECURITY INVOKER (default but explicit for clarity)
CREATE VIEW public.book_shares_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  project_id,
  user_id,
  share_token,
  is_public,
  (password_hash IS NOT NULL) as requires_password,
  view_mode,
  allow_download,
  expires_at,
  view_count,
  created_at,
  updated_at
FROM public.book_shares
WHERE is_public = true 
  AND (expires_at IS NULL OR expires_at > now());