-- Add storybook credit columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS storybook_credit_limit INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS storybook_credits_used INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_credit_reset TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update existing users based on subscription_tier (not subscription_plan)
UPDATE public.profiles
SET storybook_credit_limit = 1
WHERE subscription_tier = 'hobbi';

UPDATE public.profiles
SET storybook_credit_limit = 3
WHERE subscription_tier = 'iro';

-- Create function to check and use storybook credits
CREATE OR REPLACE FUNCTION public.use_storybook_credit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_limit INT;
  current_used INT;
  last_reset TIMESTAMPTZ;
BEGIN
  -- Get current credit info
  SELECT storybook_credit_limit, storybook_credits_used, last_credit_reset
  INTO current_limit, current_used, last_reset
  FROM profiles
  WHERE user_id = p_user_id;
  
  -- Check if we need to reset (monthly reset)
  IF last_reset < date_trunc('month', NOW()) THEN
    UPDATE profiles
    SET storybook_credits_used = 0,
        last_credit_reset = NOW()
    WHERE user_id = p_user_id;
    current_used := 0;
  END IF;
  
  -- Check if user has credits available
  IF current_used < current_limit THEN
    UPDATE profiles
    SET storybook_credits_used = storybook_credits_used + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create function to get remaining storybook credits
CREATE OR REPLACE FUNCTION public.get_storybook_credits(p_user_id uuid)
RETURNS TABLE(credit_limit INT, credits_used INT, credits_remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_reset TIMESTAMPTZ;
  current_used INT;
BEGIN
  -- Check if we need to reset (monthly reset)
  SELECT storybook_credits_used, last_credit_reset
  INTO current_used, last_reset
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF last_reset < date_trunc('month', NOW()) THEN
    UPDATE profiles
    SET storybook_credits_used = 0,
        last_credit_reset = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.storybook_credit_limit,
    p.storybook_credits_used,
    GREATEST(0, p.storybook_credit_limit - p.storybook_credits_used)
  FROM profiles p
  WHERE p.user_id = p_user_id;
END;
$$;