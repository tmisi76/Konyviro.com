CREATE POLICY "Admins can view all chapters"
ON public.chapters FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all ai generations"
ON public.ai_generations FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all credit purchases"
ON public.credit_purchases FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all audiobook purchases"
ON public.audiobook_credit_purchases FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));