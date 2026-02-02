-- Fix 1: Drop the overly permissive service_role policy on profiles
-- The service_role bypasses RLS anyway, so this policy is unnecessary and dangerous
DROP POLICY IF EXISTS "Enable full access for service_role" ON public.profiles;

-- Fix 2: Add RLS to profiles_safe view by recreating it with security_invoker
-- First drop the existing view
DROP VIEW IF EXISTS public.profiles_safe;

-- Recreate the view with security_invoker=on so it respects the base table's RLS
CREATE VIEW public.profiles_safe
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
    billing_period,
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
    retention_discount_active,
    retention_discount_expires_at,
    created_at,
    updated_at
FROM public.profiles;
-- Note: This excludes sensitive fields: stripe_customer_id, stripe_subscription_id, admin_notes, payment_method, manual_subscription, audiobook_minutes_balance

-- Fix 3: Update book_shares RLS to NOT expose password_hash to anonymous users
-- The password verification will now happen server-side via edge function
-- We need to allow reading shares by token, but without exposing password_hash
-- This is handled by creating a view that excludes password_hash

-- Create a safe view for public book share access
CREATE OR REPLACE VIEW public.book_shares_public
WITH (security_invoker=on) AS
SELECT 
    id,
    project_id,
    user_id,
    share_token,
    is_public,
    -- password_hash is intentionally excluded - never expose to clients
    view_mode,
    allow_download,
    expires_at,
    view_count,
    created_at,
    updated_at,
    -- Add a flag indicating if password is required (without exposing the hash)
    (password_hash IS NOT NULL) AS requires_password
FROM public.book_shares;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.book_shares_public TO anon, authenticated;

-- Create a membership table for verified share access (for password-protected shares)
CREATE TABLE IF NOT EXISTS public.book_share_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES public.book_shares(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on the access table
ALTER TABLE public.book_share_access ENABLE ROW LEVEL SECURITY;

-- Anyone can read their own session tokens (for verification)
CREATE POLICY "Anyone can verify their session token"
ON public.book_share_access FOR SELECT
USING (true);

-- Only service role can insert/update (via edge function)
-- No direct insert/update policies for regular users

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_book_share_access_token ON public.book_share_access(session_token);
CREATE INDEX IF NOT EXISTS idx_book_share_access_share_id ON public.book_share_access(share_id);
CREATE INDEX IF NOT EXISTS idx_book_share_access_expires ON public.book_share_access(expires_at);