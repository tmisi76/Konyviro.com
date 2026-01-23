/**
 * Robust JSON parsing utilities for handling potentially truncated or malformed AI responses
 */

/**
 * Attempts to repair and parse potentially malformed JSON
 * Handles common issues like:
 * - Markdown code blocks
 * - Truncated responses (unbalanced brackets)
 * - Trailing commas
 * - Control characters
 */
export function repairAndParseJSON<T = unknown>(content: string): T {
  if (!content || typeof content !== "string") {
    throw new Error("Empty or invalid content");
  }

  // Step 1: Remove markdown code blocks
  let cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Step 2: Try normal parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch (_e) {
    // Continue with repairs
  }

  // Step 3: Remove control characters except newlines and tabs
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Step 4: Try again after control char removal
  try {
    return JSON.parse(cleaned) as T;
  } catch (_e) {
    // Continue with more repairs
  }

  // Step 5: Balance brackets for truncated JSON
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;

  // Find where we might need to truncate (last complete object)
  if (openBraces > closeBraces || openBrackets > closeBrackets) {
    // Try to find the last complete object/array
    let lastValidIndex = cleaned.length;
    
    // Look for trailing incomplete object
    const lastOpenBrace = cleaned.lastIndexOf("{");
    const lastCloseBrace = cleaned.lastIndexOf("}");
    
    if (lastOpenBrace > lastCloseBrace) {
      // We have an unclosed object, try to close it or remove it
      const beforeLastOpen = cleaned.substring(0, lastOpenBrace);
      const lastComma = beforeLastOpen.lastIndexOf(",");
      if (lastComma > 0) {
        lastValidIndex = lastComma;
      }
    }
    
    cleaned = cleaned.substring(0, lastValidIndex);
  }

  // Step 6: Remove trailing commas before closing brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  // Step 7: Add missing closing brackets
  const newOpenBrackets = (cleaned.match(/\[/g) || []).length;
  const newCloseBrackets = (cleaned.match(/\]/g) || []).length;
  const newOpenBraces = (cleaned.match(/\{/g) || []).length;
  const newCloseBraces = (cleaned.match(/\}/g) || []).length;

  for (let i = 0; i < newOpenBraces - newCloseBraces; i++) {
    cleaned += "}";
  }
  for (let i = 0; i < newOpenBrackets - newCloseBrackets; i++) {
    cleaned += "]";
  }

  // Step 8: Final parse attempt
  try {
    return JSON.parse(cleaned) as T;
  } catch (finalError) {
    console.error("JSON repair failed. Original length:", content.length, "Cleaned length:", cleaned.length);
    console.error("First 500 chars:", cleaned.substring(0, 500));
    console.error("Last 200 chars:", cleaned.substring(cleaned.length - 200));
    throw new Error(`JSON parse failed after repairs: ${finalError instanceof Error ? finalError.message : "Unknown error"}`);
  }
}

/**
 * Validates and normalizes a scene outline array
 */
export interface SceneOutlineItem {
  scene_number: number;
  title: string;
  pov: string;
  location: string;
  time?: string;
  description: string;
  key_events: string[];
  emotional_arc?: string;
  target_words: number;
  status: string;
}

export function validateSceneOutline(data: unknown): SceneOutlineItem[] {
  if (!Array.isArray(data)) {
    throw new Error("Scene outline must be an array");
  }

  if (data.length === 0) {
    throw new Error("Scene outline cannot be empty");
  }

  return data.map((scene, index) => ({
    scene_number: typeof scene.scene_number === "number" ? scene.scene_number : index + 1,
    title: typeof scene.title === "string" ? scene.title : `Jelenet ${index + 1}`,
    pov: typeof scene.pov === "string" ? scene.pov : "Harmadik személy",
    location: typeof scene.location === "string" ? scene.location : "Ismeretlen helyszín",
    time: typeof scene.time === "string" ? scene.time : "",
    description: typeof scene.description === "string" ? scene.description : "",
    key_events: Array.isArray(scene.key_events) ? scene.key_events : [],
    emotional_arc: typeof scene.emotional_arc === "string" ? scene.emotional_arc : "",
    target_words: typeof scene.target_words === "number" ? scene.target_words : 800,
    status: "pending",
  }));
}
