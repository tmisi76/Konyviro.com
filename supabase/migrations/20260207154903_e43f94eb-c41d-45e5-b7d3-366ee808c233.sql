-- Update the default monthly_word_limit for free users from 5000 to 10000
ALTER TABLE public.profiles 
ALTER COLUMN monthly_word_limit SET DEFAULT 10000;

-- Update existing free users to have 10000 word limit
UPDATE public.profiles 
SET monthly_word_limit = 10000 
WHERE subscription_tier = 'free' AND monthly_word_limit < 10000;