-- Add payment tracking and manual subscription fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manual_subscription BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.payment_method IS 'Payment method: stripe, bank_transfer, cash, gift, manual';
COMMENT ON COLUMN public.profiles.billing_period IS 'Billing period: monthly, yearly';
COMMENT ON COLUMN public.profiles.manual_subscription IS 'True if subscription was set manually by admin (not via Stripe)';
COMMENT ON COLUMN public.profiles.admin_notes IS 'Internal admin notes about the user';