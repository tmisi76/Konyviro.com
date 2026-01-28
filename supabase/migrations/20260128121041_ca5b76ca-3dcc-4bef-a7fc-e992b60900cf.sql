-- Add RLS policy to allow service_role full access to profiles table
-- This ensures backend functions using the service role key can update subscription data

CREATE POLICY "Enable full access for service_role"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);