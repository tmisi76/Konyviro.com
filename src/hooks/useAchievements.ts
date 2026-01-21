import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserAchievement, Achievement } from "@/types/stats";
import { ACHIEVEMENTS } from "@/types/stats";
import { toast } from "sonner";

export function useAchievements() {
  const { user } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id);

      setUnlockedAchievements((data as UserAchievement[]) || []);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Check if an achievement is unlocked
  const isUnlocked = useCallback(
    (achievementId: string) => {
      return unlockedAchievements.some((a) => a.achievement_id === achievementId);
    },
    [unlockedAchievements]
  );

  // Unlock an achievement
  const unlockAchievement = useCallback(
    async (achievementId: string) => {
      if (!user || isUnlocked(achievementId)) return;

      try {
        await supabase.from("user_achievements").insert({
          user_id: user.id,
          achievement_id: achievementId,
        });

        const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
        if (achievement) {
          toast.success(`🎉 Új jelvény: ${achievement.name}`, {
            description: achievement.description,
            duration: 5000,
          });
        }

        await fetchAchievements();
      } catch (error) {
        console.error("Error unlocking achievement:", error);
      }
    },
    [user, isUnlocked, fetchAchievements]
  );

  // Check and unlock achievements based on stats
  const checkAchievements = useCallback(
    async (stats: {
      totalWords: number;
      currentStreak: number;
      completedChapters: number;
      completedBooks: number;
    }) => {
      for (const achievement of ACHIEVEMENTS) {
        if (isUnlocked(achievement.id)) continue;

        let shouldUnlock = false;

        switch (achievement.type) {
          case "words":
            shouldUnlock = stats.totalWords >= achievement.requirement;
            break;
          case "streak":
            shouldUnlock = stats.currentStreak >= achievement.requirement;
            break;
          case "chapters":
            shouldUnlock = stats.completedChapters >= achievement.requirement;
            break;
          case "books":
            shouldUnlock = stats.completedBooks >= achievement.requirement;
            break;
        }

        if (shouldUnlock) {
          await unlockAchievement(achievement.id);
        }
      }
    },
    [isUnlocked, unlockAchievement]
  );

  // Get all achievements with unlock status
  const getAllAchievements = useCallback((): (Achievement & { isUnlocked: boolean; unlockedAt?: string })[] => {
    return ACHIEVEMENTS.map((achievement) => {
      const unlocked = unlockedAchievements.find(
        (a) => a.achievement_id === achievement.id
      );
      return {
        ...achievement,
        isUnlocked: !!unlocked,
        unlockedAt: unlocked?.unlocked_at,
      };
    });
  }, [unlockedAchievements]);

  return {
    unlockedAchievements,
    isLoading,
    isUnlocked,
    unlockAchievement,
    checkAchievements,
    getAllAchievements,
    refetch: fetchAchievements,
  };
}
