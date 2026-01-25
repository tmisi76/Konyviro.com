-- Add retention offer tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS retention_offer_shown_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retention_offer_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retention_discount_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS retention_discount_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for querying active retention discounts
CREATE INDEX IF NOT EXISTS idx_profiles_retention_active 
ON public.profiles (retention_discount_active) 
WHERE retention_discount_active = true;