// Centralized timing constants for the application

// Retry configuration for API calls
export const RETRY_CONFIG = {
  MAX_RETRIES: 7,
  BASE_DELAY_MS: 5000,
  MAX_DELAY_MS: 60000,
  RETRYABLE_STATUS_CODES: [429, 502, 503] as const,
} as const;

// Calculate delay with exponential backoff
export function calculateRetryDelay(attempt: number): number {
  return Math.min(
    RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt - 1),
    RETRY_CONFIG.MAX_DELAY_MS
  );
}

// Polling intervals
export const POLLING_INTERVALS = {
  PROJECT_STATUS: 5000, // 5s for project status polling
  PROJECT_STATUS_FAST: 3000, // 3s for near-completion polling
  AUTO_SAVE: 5000, // 5s auto-save interval
  WATCHDOG: 180000, // 3 minutes watchdog timer
} as const;

// Debounce timings
export const DEBOUNCE_MS = {
  SAVE_CHANGES: 1500, // 1.5s debounce for editor changes
  SEARCH: 300, // 300ms debounce for search input
} as const;

// Timeout configurations
export const TIMEOUT_MS = {
  AI_REQUEST: 90000, // 90s for AI generation requests
  OUTLINE_REQUEST: 45000, // 45s for outline generation
  STANDARD_REQUEST: 30000, // 30s for standard API calls
} as const;

// Writing progress thresholds
export const PROGRESS_THRESHOLDS = {
  NEAR_COMPLETION_PERCENT: 90, // Start faster polling at 90%
  DYNAMIC_ESTIMATE_AFTER_SCENES: 2, // Use dynamic estimate after 2 scenes
} as const;
