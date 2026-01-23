-- ============================================
-- ADMIN SZEREPKÖR ENUM ÉS SEGÉDFÜGGVÉNY
-- ============================================

CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'support', 'viewer');

-- Admin users tábla
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role admin_role DEFAULT 'viewer' NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id)
);

-- Security definer függvény a rekurzió elkerülésére
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = _user_id
    AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = _user_id
    AND role = 'super_admin'
    AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id UUID)
RETURNS admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.admin_users
  WHERE user_id = _user_id
  AND is_active = true
  LIMIT 1
$$;

-- Admin tevékenység napló
CREATE TABLE public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES public.admin_users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RENDSZER BEÁLLÍTÁSOK
-- ============================================

CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

INSERT INTO public.system_settings (key, value, description, category) VALUES
  ('ai_default_model', '"gpt-4o"', 'Alapértelmezett AI modell könyvíráshoz', 'ai'),
  ('ai_models_available', '["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet", "gemini-pro"]', 'Elérhető AI modellek', 'ai'),
  ('ai_max_tokens_per_chapter', '8000', 'Maximum token/fejezet', 'ai'),
  ('ai_temperature', '0.7', 'AI kreativitás (0-1)', 'ai'),
  ('email_from_name', '"KönyvÍró AI"', 'Email feladó név', 'email'),
  ('email_from_address', '"hello@konyviro.ai"', 'Email feladó cím', 'email'),
  ('maintenance_mode', 'false', 'Karbantartási mód', 'general'),
  ('registration_enabled', 'true', 'Regisztráció engedélyezve', 'general'),
  ('free_trial_days', '7', 'Ingyenes próbaidő napokban', 'billing'),
  ('max_free_projects', '1', 'Max projekt ingyenes csomagban', 'billing');

-- ============================================
-- ELŐFIZETÉSI CSOMAGOK
-- ============================================

CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  stripe_product_id TEXT,
  price_monthly INTEGER,
  price_yearly INTEGER,
  currency TEXT DEFAULT 'HUF',
  features JSONB DEFAULT '[]',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
  ('Ingyenes', 'free', 'Próbáld ki ingyen', 0, 0,
   '["1 könyv projekt", "1.000 szó/hó AI generálás", "Alap export (Word, TXT)", "Közösségi támogatás"]',
   '{"max_projects": 1, "monthly_word_limit": 1000}',
   0),
  ('Hobbi', 'hobby', 'Hobbi íróknak', 4990, 29940,
   '["1 aktív projekt", "50.000 szó/hó AI generálás", "Alap export (Word, TXT)", "Email támogatás"]',
   '{"max_projects": 1, "monthly_word_limit": 50000}',
   1),
  ('Író', 'writer', 'Komoly íróknak', 14990, 89940,
   '["5 aktív projekt", "200.000 szó/hó AI generálás", "Minden műfaj (+ erotikus 18+)", "Karakter és kutatás modul", "Minden export formátum", "Prioritás támogatás"]',
   '{"max_projects": 5, "monthly_word_limit": 200000}',
   2),
  ('Pro', 'pro', 'Profi szerzőknek', 29990, 179940,
   '["Korlátlan projekt", "Korlátlan AI generálás", "Minden funkció + API", "Dedikált támogatás"]',
   '{"max_projects": -1, "monthly_word_limit": -1, "api_access": true}',
   3);

-- ============================================
-- EMAIL SABLONOK
-- ============================================

CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB DEFAULT '[]',
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.email_templates (slug, name, subject, body_html, variables, category) VALUES
  ('welcome', 'Üdvözlő email', 'Üdvözlünk a KönyvÍró AI-ban! 📚', 
   '<h1>Szia {{user_name}}!</h1><p>Köszönjük, hogy regisztráltál...</p>',
   '[{"name": "user_name", "description": "Felhasználó neve"}]',
   'transactional'),
  ('password_reset', 'Jelszó visszaállítás', 'Jelszó visszaállítási link',
   '<p>Kattints ide a jelszavad visszaállításához: <a href="{{reset_link}}">Jelszó visszaállítása</a></p>',
   '[{"name": "reset_link", "description": "Visszaállítási link"}]',
   'transactional'),
  ('subscription_activated', 'Előfizetés aktiválva', 'Előfizetésed aktiválva! 🎉',
   '<h1>Köszönjük {{user_name}}!</h1><p>A {{plan_name}} csomagod aktív...</p>',
   '[{"name": "user_name"}, {"name": "plan_name"}]',
   'transactional'),
  ('book_completed', 'Könyv elkészült', 'A könyved elkészült! 📖',
   '<h1>Gratulálunk!</h1><p>A "{{book_title}}" című könyved elkészült...</p>',
   '[{"name": "book_title"}]',
   'notification');

-- ============================================
-- ÉRTESÍTÉSEK / ANNOUNCEMENTS
-- ============================================

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'warning', 'success', 'error')) DEFAULT 'info',
  target_audience TEXT CHECK (target_audience IN ('all', 'free', 'paid', 'admin')) DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUPPORT TICKETEK
-- ============================================

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  category TEXT,
  assigned_to UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  is_admin_reply BOOLEAN DEFAULT false,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALITIKA AGGREGÁTUMOK
-- ============================================

CREATE TABLE public.analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  churned_subscriptions INTEGER DEFAULT 0,
  revenue_total INTEGER DEFAULT 0,
  projects_created INTEGER DEFAULT 0,
  chapters_generated INTEGER DEFAULT 0,
  ai_tokens_used BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXEK
-- ============================================

CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX idx_admin_activity_logs_admin ON public.admin_activity_logs(admin_user_id);
CREATE INDEX idx_admin_activity_logs_created ON public.admin_activity_logs(created_at DESC);
CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_analytics_daily_date ON public.analytics_daily(date DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

-- Admin users: csak super_admin láthatja/módosíthatja
CREATE POLICY "Super admins can manage admin users" ON public.admin_users
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view themselves" ON public.admin_users
  FOR SELECT USING (user_id = auth.uid());

-- Activity logs: adminok láthatják
CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert activity logs" ON public.admin_activity_logs
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- System settings: adminok olvashatják, super_admin módosíthatja
CREATE POLICY "Admins can view settings" ON public.system_settings
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins can modify settings" ON public.system_settings
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Subscription plans: mindenki olvashatja, admin módosíthatja
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL USING (public.is_admin(auth.uid()));

-- Email templates: adminok kezelhetik
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (public.is_admin(auth.uid()));

-- Announcements: aktívakat mindenki látja, admin kezel
CREATE POLICY "Anyone can view active announcements" ON public.announcements
  FOR SELECT USING (is_active = true AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at > NOW()));

CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL USING (public.is_admin(auth.uid()));

-- Support tickets: user a sajátját, admin mindet
CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
  FOR ALL USING (public.is_admin(auth.uid()));

-- Ticket messages: ticket tulajdonosa és admin
CREATE POLICY "Users can view messages on own tickets" ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

CREATE POLICY "Users can add messages to own tickets" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    AND is_admin_reply = false
  );

CREATE POLICY "Admins can manage all messages" ON public.support_ticket_messages
  FOR ALL USING (public.is_admin(auth.uid()));

-- Analytics: csak admin
CREATE POLICY "Admins can view analytics" ON public.analytics_daily
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert analytics" ON public.analytics_daily
  FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));