-- Fix 1: Remove overly permissive RLS policy from book_share_access
-- The edge function uses service role, so no client-side SELECT policy is needed
DROP POLICY IF EXISTS "Anyone can verify their session token" ON public.book_share_access;

-- The table already has no INSERT/UPDATE/DELETE policies for regular users
-- Service role operations bypass RLS, so verify-share-password edge function will continue to work