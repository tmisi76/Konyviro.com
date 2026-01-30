// Credit costs for various AI operations
export const COVER_GENERATION_COST = 2000;
export const COVER_EDIT_COST = 2000;
export const STORYBOOK_TEXT_COST = 3000;
export const STORYBOOK_ILLUSTRATION_COST = 500;

// Proofreading costs (8% of word count, based on Claude Sonnet 4.5 API pricing)
export const PROOFREADING_CREDIT_MULTIPLIER = 0.08;
export const PROOFREADING_MIN_CREDITS = 500;

/**
 * Calculate proofreading cost in word credits
 * Based on Gemini 2.5 Pro API pricing converted to our credit system
 */
export function calculateProofreadingCredits(wordCount: number): number {
  const calculated = Math.round(wordCount * PROOFREADING_CREDIT_MULTIPLIER);
  return Math.max(calculated, PROOFREADING_MIN_CREDITS);
}
