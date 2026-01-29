-- Insert AI model settings if they don't exist
INSERT INTO system_settings (key, value, category, description, is_sensitive)
VALUES 
  ('ai_default_model', '"google/gemini-3-flash-preview"', 'ai', 'Default AI model for book writing', false),
  ('ai_proofreading_model', '"google/gemini-2.5-pro"', 'ai', 'AI model for proofreading', false)
ON CONFLICT (key) DO NOTHING;