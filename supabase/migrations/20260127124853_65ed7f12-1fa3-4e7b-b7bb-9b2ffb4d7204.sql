-- =====================================================
-- FIX 1: RPC Functions - Replace p_user_id with auth.uid()
-- =====================================================

-- FIXED: use_extra_credits - now uses auth.uid() instead of parameter
CREATE OR REPLACE FUNCTION public.use_extra_credits(p_word_count integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_balance integer;
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get current balance
  SELECT extra_words_balance INTO current_balance
  FROM profiles
  WHERE user_id = current_user_id;
  
  -- Check if enough credits
  IF current_balance >= p_word_count THEN
    UPDATE profiles
    SET extra_words_balance = extra_words_balance - p_word_count,
        updated_at = now()
    WHERE user_id = current_user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- FIXED: use_storybook_credit - now uses auth.uid() instead of parameter
CREATE OR REPLACE FUNCTION public.use_storybook_credit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_limit INT;
  current_used INT;
  last_reset TIMESTAMPTZ;
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current credit info
  SELECT storybook_credit_limit, storybook_credits_used, last_credit_reset
  INTO current_limit, current_used, last_reset
  FROM profiles
  WHERE user_id = current_user_id;
  
  -- Check if we need to reset (monthly reset)
  IF last_reset < date_trunc('month', NOW()) THEN
    UPDATE profiles
    SET storybook_credits_used = 0,
        last_credit_reset = NOW()
    WHERE user_id = current_user_id;
    current_used := 0;
  END IF;
  
  -- Check if user has credits available
  IF current_used < current_limit THEN
    UPDATE profiles
    SET storybook_credits_used = storybook_credits_used + 1,
        updated_at = NOW()
    WHERE user_id = current_user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- FIXED: get_storybook_credits - now uses auth.uid() instead of parameter
CREATE OR REPLACE FUNCTION public.get_storybook_credits()
RETURNS TABLE(credit_limit integer, credits_used integer, credits_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  last_reset TIMESTAMPTZ;
  current_used INT;
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if we need to reset (monthly reset)
  SELECT storybook_credits_used, last_credit_reset
  INTO current_used, last_reset
  FROM profiles
  WHERE user_id = current_user_id;
  
  IF last_reset < date_trunc('month', NOW()) THEN
    UPDATE profiles
    SET storybook_credits_used = 0,
        last_credit_reset = NOW()
    WHERE user_id = current_user_id;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.storybook_credit_limit,
    p.storybook_credits_used,
    GREATEST(0, p.storybook_credit_limit - p.storybook_credits_used)
  FROM profiles p
  WHERE p.user_id = current_user_id;
END;
$$;

-- FIXED: increment_projects_created - now uses auth.uid() instead of parameter
CREATE OR REPLACE FUNCTION public.increment_projects_created()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_month text := to_char(now(), 'YYYY-MM');
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO user_usage (user_id, month, words_generated, projects_created)
  VALUES (current_user_id, current_month, 0, 1)
  ON CONFLICT (user_id, month) 
  DO UPDATE SET 
    projects_created = user_usage.projects_created + 1,
    updated_at = now();
END;
$$;

-- FIXED: increment_words_generated - now uses auth.uid() instead of parameter
CREATE OR REPLACE FUNCTION public.increment_words_generated(p_word_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_month text := to_char(now(), 'YYYY-MM');
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try to insert or update atomically
  INSERT INTO user_usage (user_id, month, words_generated, projects_created)
  VALUES (current_user_id, current_month, p_word_count, 0)
  ON CONFLICT (user_id, month) 
  DO UPDATE SET 
    words_generated = user_usage.words_generated + EXCLUDED.words_generated,
    updated_at = now();
END;
$$;

-- Create a service-role-only version for add_extra_credits (for webhooks)
-- This will be called by service role only, not by users
CREATE OR REPLACE FUNCTION public.add_extra_credits_internal(p_user_id uuid, p_word_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function should only be called by service role
  -- Check if current user is authenticated with service role
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'This function can only be called by service role';
  END IF;

  UPDATE profiles
  SET extra_words_balance = extra_words_balance + p_word_count,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Drop the old vulnerable add_extra_credits function
DROP FUNCTION IF EXISTS public.add_extra_credits(uuid, integer);

-- =====================================================
-- FIX 2 & 3: Restrict access to profiles and admin_users tables
-- =====================================================

-- Admin users: More restrictive policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can view themselves" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON public.admin_users;

-- Recreate with stricter access
CREATE POLICY "Users can view their own admin status"
ON public.admin_users
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Super admins can insert admin users"
ON public.admin_users
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update admin users"
ON public.admin_users
FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete admin users"
ON public.admin_users
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Profiles: Already has good RLS, but ensure admin_notes is not exposed
-- Create a view for safe profile access (excluding admin_notes)
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  full_name,
  display_name,
  avatar_url,
  bio,
  website,
  social_twitter,
  social_instagram,
  subscription_tier,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  monthly_word_limit,
  extra_words_balance,
  project_limit,
  storybook_credit_limit,
  storybook_credits_used,
  last_credit_reset,
  is_founder,
  founder_discount_applied,
  adult_content_verified,
  adult_verified_at,
  billing_period,
  retention_discount_active,
  retention_discount_expires_at,
  created_at,
  updated_at
FROM public.profiles;