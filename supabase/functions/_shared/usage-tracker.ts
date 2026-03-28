/**
 * Shared usage tracking for AI word generation.
 * Handles monthly limit checks and extra credits deduction.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function trackUsage(
  supabase: SupabaseClient,
  userId: string,
  wordCount: number
): Promise<void> {
  if (wordCount <= 0) return;

  const month = new Date().toISOString().slice(0, 7);

  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase
      .from("profiles")
      .select("monthly_word_limit, extra_words_balance")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("user_usage")
      .select("words_generated")
      .eq("user_id", userId)
      .eq("month", month)
      .single(),
  ]);

  const limit = profile?.monthly_word_limit || 5000;
  const used = usage?.words_generated || 0;
  const extra = profile?.extra_words_balance || 0;
  const remaining = Math.max(0, limit - used);

  if (limit === -1 || wordCount <= remaining) {
    // Unlimited plan or fits within monthly quota
    await supabase.from("user_usage").upsert(
      { user_id: userId, month, words_generated: used + wordCount, projects_created: 0 },
      { onConflict: "user_id,month" }
    );
  } else {
    // Partially or fully exceeds monthly quota — use extra credits
    if (remaining > 0) {
      await supabase.from("user_usage").upsert(
        { user_id: userId, month, words_generated: used + remaining, projects_created: 0 },
        { onConflict: "user_id,month" }
      );
    }
    const fromExtra = Math.min(wordCount - remaining, extra);
    if (fromExtra > 0) {
      await supabase
        .from("profiles")
        .update({ extra_words_balance: extra - fromExtra, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }
  }
}
