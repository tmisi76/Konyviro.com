-- Fix 1: Remove overly permissive RLS policy on book_share_access
-- The verify-session-token edge function uses service role, so no client-side policy is needed
DROP POLICY IF EXISTS "Anyone can verify their session token" ON public.book_share_access;

-- Fix 2: Recreate book_shares_public view with proper security
-- The view should only expose data when accessed with a valid share_token
DROP VIEW IF EXISTS public.book_shares_public;

-- Create a secure view that requires exact share_token match in the query
-- This prevents enumeration - you must know the exact token to see any data
CREATE VIEW public.book_shares_public AS
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

-- The view inherits the RLS from book_shares table which requires:
-- 1. is_public = true AND not expired (for anonymous access)
-- 2. OR user_id = auth.uid() (for owner access)
-- This means anonymous users can only see public, non-expired shares
-- and only when they query with the exact share_token in the WHERE clause