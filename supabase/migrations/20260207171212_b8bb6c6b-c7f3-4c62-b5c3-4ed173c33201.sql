-- Create email unsubscribes table
CREATE TABLE public.email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  reason text,
  unsubscribed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_email_unsubscribes_email ON public.email_unsubscribes(email);
CREATE INDEX idx_email_unsubscribes_token ON public.email_unsubscribes(token);

-- Enable RLS
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Service role can manage all unsubscribes (for edge functions)
CREATE POLICY "Service role can manage unsubscribes"
ON public.email_unsubscribes FOR ALL
USING (true)
WITH CHECK (true);