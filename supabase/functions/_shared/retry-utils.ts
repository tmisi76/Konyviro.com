// Shared retry utilities for edge functions

export const RETRY_CONFIG = {
  MAX_RETRIES: 7,
  BASE_DELAY_MS: 5000,
  MAX_DELAY_MS: 60000,
  RETRYABLE_STATUS_CODES: [429, 502, 503] as const,
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
 * Fetch with exponential backoff retry for transient errors (429, 502, 503)
 */
export async function fetchWithRetry({
  url,
  options,
  maxRetries = RETRY_CONFIG.MAX_RETRIES,
  timeoutMs = 90000,
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
