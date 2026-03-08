
-- Testimonials table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_role TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone can read active testimonials
CREATE POLICY "Anyone can read active testimonials"
  ON public.testimonials FOR SELECT
  USING (is_active = true);

-- Admins can manage testimonials
CREATE POLICY "Admins can manage testimonials"
  ON public.testimonials FOR ALL
  USING (is_admin(auth.uid()));

-- Insert default testimonials
INSERT INTO public.testimonials (author_name, author_role, content, rating, sort_order) VALUES
  ('Kovács Anna', 'Romantikus regény író', 'A KönyvÍró AI teljesen megváltoztatta az írási folyamatomat. Amit korábban hónapokig tartott, most heteken belül elkészül.', 5, 1),
  ('Nagy Péter', 'Thriller szerző', 'A Könyv Coach funkció fantasztikus! Segített strukturálni a gondolataimat és valódi könyvvé formálni az ötletemet.', 5, 2),
  ('Szabó Eszter', 'Kezdő író', 'Végre egy magyar nyelvű eszköz, ami érti a magyar nyelv finomságait. Az AI szövegei természetesek és az én hangomon szólnak.', 5, 3);

-- i18n: add language settings to system_settings
INSERT INTO public.system_settings (key, value, category, description) VALUES
  ('default_language', '"hu"', 'i18n', 'Alapértelmezett nyelv'),
  ('active_languages', '["hu"]', 'i18n', 'Aktív nyelvek listája')
ON CONFLICT (key) DO NOTHING;
