-- Make stripe_session_id nullable for credit-based proofreading
ALTER TABLE public.proofreading_orders 
  ALTER COLUMN stripe_session_id DROP NOT NULL;

-- Add credits_used column to track credit consumption
ALTER TABLE public.proofreading_orders 
  ADD COLUMN IF NOT EXISTS credits_used integer DEFAULT 0;