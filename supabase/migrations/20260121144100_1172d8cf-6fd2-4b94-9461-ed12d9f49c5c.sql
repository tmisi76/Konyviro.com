-- Add adult content verification fields to profiles
ALTER TABLE public.profiles
ADD COLUMN adult_content_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN adult_verified_at TIMESTAMP WITH TIME ZONE;