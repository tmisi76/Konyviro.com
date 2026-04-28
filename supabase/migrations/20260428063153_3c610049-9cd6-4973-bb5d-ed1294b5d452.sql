UPDATE public.system_settings
SET category = 'ai'
WHERE key IN (
  'ai_model_scene',
  'ai_model_structural',
  'ai_model_lector',
  'ai_model_quality',
  'ai_model_fast',
  'ai_model_vision',
  'ai_pro_fallback_to_flash'
);