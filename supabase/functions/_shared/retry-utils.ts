// Shared retry utilities for edge functions

export const RETRY_CONFIG = {
  MAX_RETRIES: 7,
  BASE_DELAY_MS: 5000,
  MAX_DELAY_MS: 60000,
  MAX_TIMEOUT_MS: 120000,
  MAX_TOKENS: 8192,
  MIN_SCENE_LENGTH: 100,
  MIN_OUTLINE_LENGTH: 50,
  RETRYABLE_STATUS_CODES: [429, 500, 502, 503, 504] as const,
} as const;

export function calculateRetryDelay(attempt: number): number {
  return Math.min(
    RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt - 1),
    RETRY_CONFIG.MAX_DELAY_MS
  );
}

export function isRetryableStatus(status: number): boolean {
  return (RETRY_CONFIG.RETRYABLE_STATUS_CODES as readonly number[]).includes(status);
}

export interface FetchWithRetryOptions {
  url: string;
  options: RequestInit;
  maxRetries?: number;
  timeoutMs?: number;
  minResponseLength?: number;
  onRetry?: (attempt: number, status?: number, error?: Error) => void;
}

export interface FetchWithRetryResult {
  response: Response | null;
  error: Error | null;
  attempts: number;
  timedOut: boolean;
  rateLimited: boolean;
}

/**
 * Fetch with exponential backoff retry for transient errors (429, 500, 502, 503, 504)
 */
export async function fetchWithRetry({
  url,
  options,
  maxRetries = RETRY_CONFIG.MAX_RETRIES,
  timeoutMs = RETRY_CONFIG.MAX_TIMEOUT_MS,
  onRetry,
}: FetchWithRetryOptions): Promise<FetchWithRetryResult> {
  let response: Response | null = null;
  let lastError: Error | null = null;
  let timedOut = false;
  let rateLimited = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for retryable status codes
      if (isRetryableStatus(response.status)) {
        console.error(`Status ${response.status} (attempt ${attempt}/${maxRetries})`);
        
        if (response.status === 429) {
          rateLimited = true;
        }

        if (attempt < maxRetries) {
          onRetry?.(attempt, response.status);
          const delay = calculateRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // Success or non-retryable error
      return { response, error: null, attempts: attempt, timedOut: false, rateLimited };

    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      console.error(`Fetch error (attempt ${attempt}/${maxRetries}):`, lastError.message);

      // Handle timeout (AbortError)
      if (lastError.name === "AbortError") {
        timedOut = true;
        if (attempt < maxRetries) {
          onRetry?.(attempt, undefined, lastError);
          const delay = calculateRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return { response: null, error: lastError, attempts: attempt, timedOut: true, rateLimited: false };
      }

      // Retry on network errors
      if (attempt < maxRetries) {
        onRetry?.(attempt, undefined, lastError);
        const delay = calculateRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  return { response, error: lastError, attempts: maxRetries, timedOut, rateLimited };
}

/**
 * Create standardized error response with CORS headers
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Create success response with CORS headers
 */
export function createSuccessResponse(
  data: unknown,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify(data),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Parse AI response safely with fallback for truncated/malformed JSON
 */
export async function parseAIResponseSafely(
  response: Response,
  minLength: number = 100
): Promise<{ content: string | null; error: string | null }> {
  try {
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === "") {
      return { content: null, error: "Empty response from API" };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw response (first 500 chars):", responseText.substring(0, 500));
      return { content: null, error: "Failed to parse API response" };
    }

    // Extract content from OpenAI-compatible format
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("Invalid response structure:", JSON.stringify(data).substring(0, 200));
      return { content: null, error: "Invalid response structure" };
    }

    if (content.length < minLength) {
      console.error(`Response too short: ${content.length} chars (min: ${minLength})`);
      return { content: null, error: `Response too short (${content.length} chars)` };
    }

    return { content, error: null };
  } catch (error) {
    console.error("Unexpected error in parseAIResponseSafely:", error);
    return { content: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
