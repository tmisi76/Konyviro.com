-- Create RPC function for using storybook credit (uses auth.uid())
CREATE OR REPLACE FUNCTION public.use_storybook_credit_v2()
RETURNS VOID AS $$
DECLARE
  current_user_id UUID := auth.uid();
  credits_limit INT;
  credits_used INT;
  last_reset TIMESTAMPTZ;
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get credit data
  SELECT storybook_credit_limit, storybook_credits_used, last_credit_reset
  INTO credits_limit, credits_used, last_reset
  FROM public.profiles
  WHERE user_id = current_user_id;

  -- Check if we need to reset (monthly reset)
  IF last_reset < date_trunc('month', NOW()) THEN
    UPDATE public.profiles
    SET storybook_credits_used = 0,
        last_credit_reset = NOW()
    WHERE user_id = current_user_id;
    credits_used := 0;
  END IF;

  -- Check if there are credits remaining
  IF credits_used >= credits_limit THEN
    RAISE EXCEPTION 'No storybook credits left for this month.';
  END IF;

  -- Use credit
  UPDATE public.profiles
  SET storybook_credits_used = storybook_credits_used + 1,
      updated_at = NOW()
  WHERE user_id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;