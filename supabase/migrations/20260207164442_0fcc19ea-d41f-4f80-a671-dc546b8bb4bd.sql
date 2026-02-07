-- Create admin_email_campaigns table for storing sent email campaigns
CREATE TABLE public.admin_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  recipient_type text NOT NULL DEFAULT 'all',
  recipient_filter jsonb DEFAULT '{}'::jsonb,
  recipient_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_email_campaigns ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email campaigns
CREATE POLICY "Admins can manage email campaigns"
ON public.admin_email_campaigns FOR ALL
USING (is_admin(auth.uid()));

-- Create function to count campaign recipients
CREATE OR REPLACE FUNCTION public.count_campaign_recipients(
  p_recipient_type text,
  p_filter_value text DEFAULT NULL,
  p_inactive_days integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result integer;
BEGIN
  -- Only admins can call this
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_recipient_type = 'all' THEN
    SELECT COUNT(*) INTO result FROM auth.users;
  ELSIF p_recipient_type = 'plan' THEN
    SELECT COUNT(*) INTO result 
    FROM profiles 
    WHERE subscription_tier = p_filter_value;
  ELSIF p_recipient_type = 'inactive' THEN
    SELECT COUNT(*) INTO result 
    FROM profiles 
    WHERE updated_at < NOW() - (p_inactive_days || ' days')::interval;
  ELSE
    result := 0;
  END IF;

  RETURN result;
END;
$$;