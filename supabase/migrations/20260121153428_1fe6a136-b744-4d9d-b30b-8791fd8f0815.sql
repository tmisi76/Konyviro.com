-- Add subscription fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free',
ADD COLUMN subscription_status text NOT NULL DEFAULT 'active',
ADD COLUMN is_founder boolean NOT NULL DEFAULT false,
ADD COLUMN founder_discount_applied boolean NOT NULL DEFAULT false,
ADD COLUMN subscription_start_date timestamp with time zone,
ADD COLUMN subscription_end_date timestamp with time zone,
ADD COLUMN stripe_customer_id text,
ADD COLUMN stripe_subscription_id text,
ADD COLUMN monthly_word_limit integer NOT NULL DEFAULT 5000,
ADD COLUMN project_limit integer NOT NULL DEFAULT 1;

-- Add constraint for subscription_tier
ALTER TABLE public.profiles
ADD CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'hobby', 'writer', 'pro'));

-- Add constraint for subscription_status
ALTER TABLE public.profiles
ADD CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'past_due'));

-- Create user_usage table for tracking monthly usage
CREATE TABLE public.user_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month text NOT NULL, -- Format: YYYY-MM
  words_generated integer NOT NULL DEFAULT 0,
  projects_created integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Enable RLS on user_usage
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_usage
CREATE POLICY "Users can view their own usage"
ON public.user_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
ON public.user_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
ON public.user_usage FOR UPDATE
USING (auth.uid() = user_id);

-- Create founder_spots table for tracking founder program
CREATE TABLE public.founder_spots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_spots integer NOT NULL DEFAULT 100,
  spots_taken integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert initial founder spots record
INSERT INTO public.founder_spots (total_spots, spots_taken) VALUES (100, 0);

-- Enable RLS on founder_spots (public read, admin write)
ALTER TABLE public.founder_spots ENABLE ROW LEVEL SECURITY;

-- Anyone can read founder spots
CREATE POLICY "Anyone can view founder spots"
ON public.founder_spots FOR SELECT
USING (true);

-- Create trigger for updated_at on user_usage
CREATE TRIGGER update_user_usage_updated_at
BEFORE UPDATE ON public.user_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on founder_spots
CREATE TRIGGER update_founder_spots_updated_at
BEFORE UPDATE ON public.founder_spots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();