-- Create proofreading_orders table for AI proofreading service
CREATE TABLE public.proofreading_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_chapter_index INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add check constraint for status
ALTER TABLE public.proofreading_orders 
ADD CONSTRAINT proofreading_orders_status_check 
CHECK (status IN ('pending', 'paid', 'processing', 'completed', 'failed'));

-- Enable RLS
ALTER TABLE public.proofreading_orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view their own proofreading orders"
ON public.proofreading_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create their own proofreading orders"
ON public.proofreading_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can update orders (for webhook and processing)
CREATE POLICY "Service role can update proofreading orders"
ON public.proofreading_orders
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Admins can view all orders
CREATE POLICY "Admins can view all proofreading orders"
ON public.proofreading_orders
FOR SELECT
USING (is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_proofreading_orders_user_id ON public.proofreading_orders(user_id);
CREATE INDEX idx_proofreading_orders_project_id ON public.proofreading_orders(project_id);
CREATE INDEX idx_proofreading_orders_status ON public.proofreading_orders(status);
CREATE INDEX idx_proofreading_orders_stripe_session ON public.proofreading_orders(stripe_session_id);