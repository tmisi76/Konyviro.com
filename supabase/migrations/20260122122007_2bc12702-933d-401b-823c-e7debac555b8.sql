-- Add extra_words_balance column to profiles table for tracking purchased credits
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS extra_words_balance integer NOT NULL DEFAULT 0;

-- Create table to track credit purchases
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL UNIQUE,
  amount integer NOT NULL,
  words_purchased integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own credit purchases" 
ON public.credit_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit purchases" 
ON public.credit_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to use extra credits (called when monthly limit is exceeded)
CREATE OR REPLACE FUNCTION public.use_extra_credits(p_user_id uuid, p_word_count integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance integer;
BEGIN
  -- Get current balance
  SELECT extra_words_balance INTO current_balance
  FROM profiles
  WHERE user_id = p_user_id;
  
  -- Check if enough credits
  IF current_balance >= p_word_count THEN
    UPDATE profiles
    SET extra_words_balance = extra_words_balance - p_word_count,
        updated_at = now()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create function to add credits (called by webhook)
CREATE OR REPLACE FUNCTION public.add_extra_credits(p_user_id uuid, p_word_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET extra_words_balance = extra_words_balance + p_word_count,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;