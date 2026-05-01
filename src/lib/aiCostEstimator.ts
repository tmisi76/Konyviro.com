/**
 * AI cost estimator (USD → HUF)
 * Prices per 1M tokens. Update when Lovable AI Gateway pricing changes.
 */

const USD_TO_HUF = 395;

interface ModelPrice {
  input: number;  // USD per 1M input tokens
  output: number; // USD per 1M output tokens
}

const MODEL_PRICES: Record<string, ModelPrice> = {
  // Gemini 3
  "google/gemini-3-pro-preview": { input: 1.25, output: 10 },
  "google/gemini-3.1-pro-preview": { input: 1.25, output: 10 },
  "google/gemini-3-flash-preview": { input: 0.30, output: 2.50 },
  "google/gemini-3.1-flash-image-preview": { input: 0.30, output: 2.50 },
  "google/gemini-3-pro-image-preview": { input: 1.25, output: 10 },
  // Gemini 2.5
  "google/gemini-2.5-pro": { input: 1.25, output: 10 },
  "google/gemini-2.5-flash": { input: 0.30, output: 2.50 },
  "google/gemini-2.5-flash-lite": { input: 0.10, output: 0.40 },
  // OpenAI
  "openai/gpt-5": { input: 1.25, output: 10 },
  "openai/gpt-5-mini": { input: 0.25, output: 2.00 },
  "openai/gpt-5-nano": { input: 0.05, output: 0.40 },
  "openai/gpt-5.2": { input: 2.00, output: 16 },
};

const DEFAULT_PRICE: ModelPrice = { input: 0.50, output: 4 };

function priceFor(model: string): ModelPrice {
  return MODEL_PRICES[model] || DEFAULT_PRICE;
}

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = priceFor(model);
  return (
    (promptTokens / 1_000_000) * p.input +
    (completionTokens / 1_000_000) * p.output
  );
}

export function estimateCostHuf(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  return estimateCostUsd(model, promptTokens, completionTokens) * USD_TO_HUF;
}

export interface GenerationLike {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens?: number;
}

export interface CostAggregate {
  totalHuf: number;
  totalUsd: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  generationCount: number;
  byModel: Record<string, {
    huf: number;
    tokens: number;
    count: number;
  }>;
}

export function aggregateCosts(generations: GenerationLike[]): CostAggregate {
  const agg: CostAggregate = {
    totalHuf: 0,
    totalUsd: 0,
    totalTokens: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    generationCount: generations.length,
    byModel: {},
  };

  for (const g of generations) {
    const usd = estimateCostUsd(g.model, g.prompt_tokens || 0, g.completion_tokens || 0);
    const huf = usd * USD_TO_HUF;
    const tokens = (g.prompt_tokens || 0) + (g.completion_tokens || 0);
    agg.totalUsd += usd;
    agg.totalHuf += huf;
    agg.totalTokens += tokens;
    agg.totalPromptTokens += g.prompt_tokens || 0;
    agg.totalCompletionTokens += g.completion_tokens || 0;
    if (!agg.byModel[g.model]) {
      agg.byModel[g.model] = { huf: 0, tokens: 0, count: 0 };
    }
    agg.byModel[g.model].huf += huf;
    agg.byModel[g.model].tokens += tokens;
    agg.byModel[g.model].count += 1;
  }

  return agg;
}

export function formatHuf(value: number): string {
  return `${Math.round(value).toLocaleString("hu-HU")} Ft`;
}

/** Subscription monthly price (HUF) for revenue estimation */
export const TIER_MONTHLY_PRICE_HUF: Record<string, number> = {
  free: 0,
  hobby: 9_990,
  hobbi: 9_990,
  writer: 19_990,
  pro: 19_990,
  profi: 19_990,
  agency: 49_990,
  ugynokseg: 49_990,
};

export function tierPriceHuf(tier: string | null | undefined): number {
  if (!tier) return 0;
  return TIER_MONTHLY_PRICE_HUF[tier.toLowerCase()] ?? 0;
}