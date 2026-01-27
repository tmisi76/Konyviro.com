-- Strengthen analytics_daily access control
-- Only super_admins should access sensitive business metrics

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view analytics" ON public.analytics_daily;
DROP POLICY IF EXISTS "System can insert analytics" ON public.analytics_daily;

-- Create more restrictive policies - only super_admins can view business metrics
CREATE POLICY "Only super admins can view analytics" 
ON public.analytics_daily 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Only super_admins can insert analytics data
CREATE POLICY "Only super admins can insert analytics" 
ON public.analytics_daily 
FOR INSERT 
WITH CHECK (is_super_admin(auth.uid()));