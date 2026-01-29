-- Add audiobook minutes balance to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS audiobook_minutes_balance INTEGER NOT NULL DEFAULT 0;

-- Create audiobook credit purchases table
CREATE TABLE IF NOT EXISTS public.audiobook_credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  minutes_purchased INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.audiobook_credit_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for audiobook_credit_purchases
CREATE POLICY "Users can view their own audiobook purchases"
ON public.audiobook_credit_purchases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audiobook purchases"
ON public.audiobook_credit_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can update (for webhook)
CREATE POLICY "Service role can update audiobook purchases"
ON public.audiobook_credit_purchases
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create RPC function for using audiobook minutes (auth.uid() based)
CREATE OR REPLACE FUNCTION public.use_audiobook_minutes(p_minutes INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_balance INTEGER;
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get current balance
  SELECT audiobook_minutes_balance INTO current_balance
  FROM profiles
  WHERE user_id = current_user_id;
  
  -- Check if enough credits
  IF current_balance >= p_minutes THEN
    UPDATE profiles
    SET audiobook_minutes_balance = audiobook_minutes_balance - p_minutes,
        updated_at = now()
    WHERE user_id = current_user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create internal function for service role to add minutes
CREATE OR REPLACE FUNCTION public.add_audiobook_minutes_internal(p_user_id UUID, p_minutes INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function should only be called by service role
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'This function can only be called by service role';
  END IF;

  UPDATE profiles
  SET audiobook_minutes_balance = audiobook_minutes_balance + p_minutes,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Create function to get audiobook credits balance
CREATE OR REPLACE FUNCTION public.get_audiobook_credits()
RETURNS TABLE(minutes_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT p.audiobook_minutes_balance
  FROM profiles p
  WHERE p.user_id = current_user_id;
END;
$$;