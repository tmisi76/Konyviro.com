import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AISettings {
  temperature: number;
  frequency_penalty: number;
  presence_penalty: number;
}

const DEFAULT_AI_SETTINGS: AISettings = {
  temperature: 0.75,
  frequency_penalty: 0.4,
  presence_penalty: 0.3,
};

export type AITask =
  | "scene"        // jelenet- és fejezetírás (lassú, drága, kritikus minőség)
  | "structural"   // story, outline, karakter generálás
  | "lector"       // auto-lektor és refine
  | "quality"      // quality checker, audit, fact-check
  | "fast"         // chapter-recap, summary, voice, style elemzés
  | "vision";      // képelemzés

const DEFAULT_MODELS: Record<AITask, string> = {
  scene: "google/gemini-3-pro-preview",
  structural: "google/gemini-3-pro-preview",
  lector: "google/gemini-3-pro-preview",
  quality: "google/gemini-3-pro-preview",
  fast: "google/gemini-3-flash-preview",
  vision: "google/gemini-2.5-flash",
};

const TASK_TO_KEY: Record<AITask, string> = {
  scene: "ai_model_scene",
  structural: "ai_model_structural",
  lector: "ai_model_lector",
  quality: "ai_model_quality",
  fast: "ai_model_fast",
  vision: "ai_model_vision",
};

export const FLASH_FALLBACK = "google/gemini-3-flash-preview";

/**
 * Returns the configured model id for the given AI task.
 * Falls back to defaults (mostly Pro) if system_settings is unavailable.
 */
export async function getModelForTask(task: AITask): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return DEFAULT_MODELS[task];

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const key = TASK_TO_KEY[task];
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error || !data) return DEFAULT_MODELS[task];
    const raw = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    if (typeof raw === "string" && raw.length > 0) return raw;
    return DEFAULT_MODELS[task];
  } catch (err) {
    console.error(`[ai-settings] getModelForTask(${task}) error:`, err);
    return DEFAULT_MODELS[task];
  }
}

/**
 * Should we automatically retry on Flash if Pro is rate-limited?
 */
export async function shouldFallbackToFlash(): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return true;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "ai_pro_fallback_to_flash")
      .maybeSingle();
    if (!data) return true;
    const raw = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    return raw === true || raw === "true";
  } catch {
    return true;
  }
}

/**
 * Fetch AI generation parameters from system_settings table.
 * Returns sensible defaults if settings are not configured.
 */
export async function getAISettings(supabaseUrl: string, serviceRoleKey: string): Promise<AISettings> {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const keys = ["ai_temperature", "ai_frequency_penalty", "ai_presence_penalty"];
    const { data, error } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", keys);

    if (error || !data || data.length === 0) {
      console.log("No AI settings found, using defaults");
      return DEFAULT_AI_SETTINGS;
    }

    const settingsMap: Record<string, unknown> = {};
    for (const row of data) {
      const val = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      settingsMap[row.key] = val;
    }

    return {
      temperature: parseFloat(String(settingsMap.ai_temperature ?? DEFAULT_AI_SETTINGS.temperature)),
      frequency_penalty: parseFloat(String(settingsMap.ai_frequency_penalty ?? DEFAULT_AI_SETTINGS.frequency_penalty)),
      presence_penalty: parseFloat(String(settingsMap.ai_presence_penalty ?? DEFAULT_AI_SETTINGS.presence_penalty)),
    };
  } catch (err) {
    console.error("Error fetching AI settings:", err);
    return DEFAULT_AI_SETTINGS;
  }
}
