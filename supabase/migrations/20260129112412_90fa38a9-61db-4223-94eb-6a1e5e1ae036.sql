-- Atomikus content hozzáfűzés a chapters táblához
-- Ez megakadályozza a race condition-t párhuzamos jelenet írásnál

CREATE OR REPLACE FUNCTION append_chapter_content(
  p_chapter_id UUID,
  p_new_content TEXT,
  p_word_count_delta INTEGER DEFAULT 0
) RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Calculate total word count from the new content
  total_words := array_length(
    string_to_array(regexp_replace(trim(new_content), '\s+', ' ', 'g'), ' '), 1
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
$$;