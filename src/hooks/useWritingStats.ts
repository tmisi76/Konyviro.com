import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { WritingSession, UserGoals, UserStreak, DailyStats } from "@/types/stats";

export function useWritingStats() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WritingSession[]>([]);
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch writing sessions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessionsData } = await supabase
        .from("writing_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("session_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("session_date", { ascending: false });

      setSessions((sessionsData as WritingSession[]) || []);

      // Fetch user goals
      const { data: goalsData } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (goalsData) {
        setGoals(goalsData as UserGoals);
      } else {
        // Create default goals
        const { data: newGoals } = await supabase
          .from("user_goals")
          .insert({ user_id: user.id })
          .select()
          .single();
        setGoals(newGoals as UserGoals);
      }

      // Fetch user streak
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (streakData) {
        setStreak(streakData as UserStreak);
      } else {
        // Create default streak
        const { data: newStreak } = await supabase
          .from("user_streaks")
          .insert({ user_id: user.id })
          .select()
          .single();
        setStreak(newStreak as UserStreak);
      }
    } catch (error) {
      console.error("Error fetching writing stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Record a writing session
  const recordSession = useCallback(
    async (
      projectId: string,
      wordsWritten: number,
      aiWordsGenerated: number = 0,
      durationSeconds: number = 0
    ) => {
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      // Check if there's already a session for today on this project
      const existingSession = sessions.find(
        (s) => s.project_id === projectId && s.session_date === today
      );

      if (existingSession) {
        // Update existing session
        await supabase
          .from("writing_sessions")
          .update({
            words_written: existingSession.words_written + wordsWritten,
            ai_words_generated: existingSession.ai_words_generated + aiWordsGenerated,
            duration_seconds: existingSession.duration_seconds + durationSeconds,
          })
          .eq("id", existingSession.id);
      } else {
        // Create new session
        await supabase.from("writing_sessions").insert({
          user_id: user.id,
          project_id: projectId,
          words_written: wordsWritten,
          ai_words_generated: aiWordsGenerated,
          duration_seconds: durationSeconds,
          session_date: today,
        });
      }

      // Update streak
      await updateStreak();
      await fetchStats();
    },
    [user, sessions, fetchStats]
  );

  // Update streak logic
  const updateStreak = useCallback(async () => {
    if (!user || !streak) return;

    const today = new Date().toISOString().split("T")[0];
    const lastWritingDate = streak.last_writing_date;

    if (lastWritingDate === today) {
      // Already wrote today
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let newStreak = streak.current_streak;

    if (lastWritingDate === yesterdayStr) {
      // Continued streak
      newStreak += 1;
    } else if (lastWritingDate) {
      // Check if streak recovery can be used
      const lastWriting = new Date(lastWritingDate);
      const daysDiff = Math.floor(
        (new Date().getTime() - lastWriting.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 2 && !streak.streak_recovery_used_at) {
        // Use streak recovery
        newStreak += 1;
        await supabase
          .from("user_streaks")
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, streak.longest_streak),
            last_writing_date: today,
            streak_recovery_used_at: today,
          })
          .eq("user_id", user.id);
        return;
      } else {
        // Streak broken
        newStreak = 1;
      }
    } else {
      // First time writing
      newStreak = 1;
    }

    // Reset streak recovery weekly
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const recoveryDate = streak.streak_recovery_used_at
      ? new Date(streak.streak_recovery_used_at)
      : null;

    const resetRecovery = recoveryDate && recoveryDate < weekStart;

    await supabase
      .from("user_streaks")
      .update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streak.longest_streak),
        last_writing_date: today,
        streak_recovery_used_at: resetRecovery ? null : streak.streak_recovery_used_at,
      })
      .eq("user_id", user.id);
  }, [user, streak]);

  // Update goals
  const updateGoals = useCallback(
    async (updates: Partial<UserGoals>) => {
      if (!user) return;

      await supabase.from("user_goals").update(updates).eq("user_id", user.id);
      await fetchStats();
    },
    [user, fetchStats]
  );

  // Calculate daily stats for chart
  const getDailyStats = useCallback(
    (days: number = 7): DailyStats[] => {
      const stats: DailyStats[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const daySessions = sessions.filter((s) => s.session_date === dateStr);
        const words = daySessions.reduce((sum, s) => sum + s.words_written, 0);
        const aiWords = daySessions.reduce((sum, s) => sum + s.ai_words_generated, 0);

        stats.push({
          date: dateStr,
          words,
          aiWords,
        });
      }

      return stats;
    },
    [sessions]
  );

  // Get total words written
  const getTotalWords = useCallback(() => {
    return sessions.reduce((sum, s) => sum + s.words_written, 0);
  }, [sessions]);

  // Get today's words
  const getTodayWords = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    return sessions
      .filter((s) => s.session_date === today)
      .reduce((sum, s) => sum + s.words_written, 0);
  }, [sessions]);

  // Get average words per session
  const getAverageWords = useCallback(() => {
    if (sessions.length === 0) return 0;
    const total = sessions.reduce((sum, s) => sum + s.words_written, 0);
    return Math.round(total / sessions.length);
  }, [sessions]);

  // Get best day
  const getBestDay = useCallback(() => {
    const dailyTotals = new Map<string, number>();
    sessions.forEach((s) => {
      const current = dailyTotals.get(s.session_date) || 0;
      dailyTotals.set(s.session_date, current + s.words_written);
    });

    let bestDate = "";
    let bestWords = 0;
    dailyTotals.forEach((words, date) => {
      if (words > bestWords) {
        bestWords = words;
        bestDate = date;
      }
    });

    return { date: bestDate, words: bestWords };
  }, [sessions]);

  // Get writing calendar data (GitHub-style)
  const getCalendarData = useCallback(() => {
    const data: { date: string; level: number }[] = [];
    const today = new Date();
    const maxWords = Math.max(...sessions.map((s) => s.words_written), 1);

    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayWords = sessions
        .filter((s) => s.session_date === dateStr)
        .reduce((sum, s) => sum + s.words_written, 0);

      // Level 0-4 based on words written
      let level = 0;
      if (dayWords > 0) {
        const ratio = dayWords / maxWords;
        if (ratio > 0.75) level = 4;
        else if (ratio > 0.5) level = 3;
        else if (ratio > 0.25) level = 2;
        else level = 1;
      }

      data.push({ date: dateStr, level });
    }

    return data;
  }, [sessions]);

  return {
    sessions,
    goals,
    streak,
    isLoading,
    recordSession,
    updateGoals,
    getDailyStats,
    getTotalWords,
    getTodayWords,
    getAverageWords,
    getBestDay,
    getCalendarData,
    refetch: fetchStats,
  };
}
