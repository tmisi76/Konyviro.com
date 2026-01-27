-- Add admin RLS policy to profiles table
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_admin(auth.uid()));

-- Add admin RLS policy to projects table for admin stats
CREATE POLICY "Admins can view all projects"
ON public.projects FOR SELECT
USING (is_admin(auth.uid()));