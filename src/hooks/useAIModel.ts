import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Model ID to display name mapping
export const AI_MODEL_NAMES: Record<string, string> = {
  "google/gemini-3-flash-preview": "Gemini 3 Flash",
  "google/gemini-3-pro-preview": "Gemini 3 Pro",
  "google/gemini-2.5-pro": "Gemini 2.5 Pro",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "google/gemini-2.5-flash-lite": "Gemini 2.5 Flash Lite",
  "openai/gpt-5": "GPT-5",
  "openai/gpt-5-mini": "GPT-5 Mini",
  "openai/gpt-5-nano": "GPT-5 Nano",
  "openai/gpt-5.2": "GPT-5.2",
  "anthropic/claude-sonnet-4.5": "Claude Sonnet 4.5",
};

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

interface AIModelSettings {
  defaultModel: string;
  defaultModelName: string;
  proofreadingModel: string;
  proofreadingModelName: string;
}

export function useAIModel() {
  return useQuery<AIModelSettings>({
    queryKey: ["ai-model-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", ["ai_default_model", "ai_proofreading_model"]);

      if (error) {
        console.error("Failed to fetch AI model settings:", error);
        return {
          defaultModel: DEFAULT_MODEL,
          defaultModelName: AI_MODEL_NAMES[DEFAULT_MODEL] || "AI",
          proofreadingModel: "anthropic/claude-sonnet-4.5",
          proofreadingModelName: "Claude Sonnet 4.5",
        };
      }

      const settings: Record<string, string> = {};
      data?.forEach((row) => {
        try {
          // Value is stored as JSON string
          const parsed = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
          settings[row.key] = parsed;
        } catch {
          settings[row.key] = row.value as string;
        }
      });

      const defaultModel = settings.ai_default_model || DEFAULT_MODEL;
      const proofreadingModel = "anthropic/claude-sonnet-4.5"; // Fixed to Claude Sonnet 4.5

      return {
        defaultModel,
        defaultModelName: AI_MODEL_NAMES[defaultModel] || defaultModel.split("/").pop() || "AI",
        proofreadingModel,
        proofreadingModelName: AI_MODEL_NAMES[proofreadingModel] || proofreadingModel.split("/").pop() || "AI",
      };
    },
    staleTime: 60000, // 1 minute cache
    gcTime: 300000, // 5 minutes garbage collection
  });
}

export function getModelDisplayName(modelId: string): string {
  return AI_MODEL_NAMES[modelId] || modelId.split("/").pop() || "AI";
}
