-- Fejezet tartalom oszlop hozzáadása
ALTER TABLE public.chapters 
ADD COLUMN content TEXT;

-- Index az üres tartalom kereséséhez (optimalizáció)
CREATE INDEX idx_chapters_has_content 
ON public.chapters ((content IS NOT NULL AND content != ''));