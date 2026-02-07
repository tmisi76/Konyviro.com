-- Fix: The referrals table needs INSERT policy only for service role
-- The RLS_ENABLED_NO_POLICY warning is for referrals INSERT - we intentionally only allow service role
-- No action needed for SELECT as we already have that policy

-- Note: The "permissive RLS policy" warnings are from OTHER tables (audiobook_chapters, audiobook_credit_purchases)
-- not from this migration. Those were pre-existing issues.

-- For referrals, we do NOT want users to insert directly - only service role should insert
-- This is correct behavior, so we just need to acknowledge the INFO warning is expected