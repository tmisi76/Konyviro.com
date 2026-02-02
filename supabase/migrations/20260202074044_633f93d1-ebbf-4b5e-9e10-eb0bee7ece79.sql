-- Fix word counting in append_chapter_content function
-- The old logic used array_length which counted empty strings
-- New logic uses regexp_split_to_table with proper filtering

CREATE OR REPLACE FUNCTION public.append_chapter_content(p_chapter_id uuid, p_new_content text, p_word_count_delta integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_content TEXT;
  new_content TEXT;
  total_words INTEGER;
BEGIN
  -- Lock the row to prevent race conditions (SELECT FOR UPDATE)
  SELECT content INTO current_content
  FROM chapters
  WHERE id = p_chapter_id
  FOR UPDATE;
  
  -- Append content with separator
  IF current_content IS NULL OR current_content = '' THEN
    new_content := p_new_content;
  ELSE
    new_content := current_content || E'\n\n' || p_new_content;
  END IF;
  
  -- Calculate total word count - FIXED: filter out empty strings
  -- This is equivalent to JS: text.trim().split(/\s+/).filter(Boolean).length
  total_words := (
    SELECT count(*)::integer
    FROM regexp_split_to_table(trim(new_content), E'\\s+') AS word
    WHERE word IS NOT NULL AND length(trim(word)) > 0
  );
  
  -- Update atomically - content, word_count, és scenes_completed egyben
  UPDATE chapters
  SET 
    content = new_content,
    word_count = COALESCE(total_words, 0),
    scenes_completed = COALESCE(scenes_completed, 0) + 1,
    writing_status = 'writing',
    updated_at = now()
  WHERE id = p_chapter_id;
END;
$function$;

-- Recalculate word_count for all existing chapters with content
UPDATE chapters
SET word_count = (
  SELECT count(*)::integer
  FROM regexp_split_to_table(trim(content), E'\\s+') AS word
  WHERE word IS NOT NULL AND length(trim(word)) > 0
)
WHERE content IS NOT NULL AND content != '';

-- Also update project total word counts
UPDATE projects p
SET word_count = (
  SELECT COALESCE(SUM(c.word_count), 0)::integer
  FROM chapters c
  WHERE c.project_id = p.id
);