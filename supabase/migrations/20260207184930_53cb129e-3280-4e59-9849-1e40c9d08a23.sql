-- Fix 1: Secure email_unsubscribes table
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Service role can manage unsubscribes" ON public.email_unsubscribes;

-- Create proper RLS policies that restrict access appropriately
-- Only service role (edge functions) should manage unsubscribes
-- Users should only be able to view/manage their own unsubscribe record
CREATE POLICY "Users can view their own unsubscribe record"
ON public.email_unsubscribes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unsubscribe record"
ON public.email_unsubscribes
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Admins can view all unsubscribe records"
ON public.email_unsubscribes
FOR SELECT
USING (is_admin(auth.uid()));

-- Fix 2: Recreate profiles_safe view with security_invoker = true
-- This ensures the view respects the RLS policies of the underlying profiles table
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = true)
AS SELECT
  id,
  user_id,
  adult_content_verified,
  adult_verified_at,
  avatar_url,
  billing_period,
  bio,
  created_at,
  display_name,
  extra_words_balance,
  founder_discount_applied,
  full_name,
  is_founder,
  last_credit_reset,
  monthly_word_limit,
  project_limit,
  retention_discount_active,
  retention_discount_expires_at,
  social_instagram,
  social_twitter,
  storybook_credit_limit,
  storybook_credits_used,
  subscription_end_date,
  subscription_start_date,
  subscription_status,
  subscription_tier,
  updated_at,
  website
FROM public.profiles;

-- Grant appropriate permissions
GRANT SELECT ON public.profiles_safe TO authenticated;
REVOKE SELECT ON public.profiles_safe FROM anon;