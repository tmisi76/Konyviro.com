-- Create function to increment projects_created count
CREATE OR REPLACE FUNCTION public.increment_projects_created(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month text := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO user_usage (user_id, month, words_generated, projects_created)
  VALUES (p_user_id, current_month, 0, 1)
  ON CONFLICT (user_id, month) 
  DO UPDATE SET 
    projects_created = user_usage.projects_created + 1,
    updated_at = now();
END;
$$;