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
