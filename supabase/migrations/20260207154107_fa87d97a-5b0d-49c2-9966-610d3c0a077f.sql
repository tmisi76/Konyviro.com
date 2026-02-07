-- 1. Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by uuid,
ADD COLUMN IF NOT EXISTS referral_bonus_received boolean DEFAULT false;

-- 2. Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  referrer_bonus integer DEFAULT 10000,
  referred_bonus integer DEFAULT 10000,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 4. RLS policy: Users can view their own referrals (as referrer or referred)
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- 5. Generate referral codes for existing users who don't have one
UPDATE public.profiles 
SET referral_code = upper(substr(md5(random()::text || id::text), 1, 6))
WHERE referral_code IS NULL;

-- 6. Update handle_new_user function to generate referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_referral_code text;
BEGIN
  -- Generate unique referral code
  new_referral_code := upper(substr(md5(random()::text || NEW.id::text), 1, 6));
  
  -- Ensure uniqueness by checking and regenerating if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code) LOOP
    new_referral_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  END LOOP;

  INSERT INTO public.profiles (user_id, full_name, referral_code)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', new_referral_code);
  RETURN NEW;
END;
$function$;

-- 7. Create index for faster referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);