import { AchievementBadge } from "./AchievementBadge";
import type { Achievement } from "@/types/stats";

interface AchievementsPanelProps {
  achievements: (Achievement & { isUnlocked: boolean; unlockedAt?: string })[];
}

export function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  const unlocked = achievements.filter((a) => a.isUnlocked);
  const locked = achievements.filter((a) => !a.isUnlocked);

  return (
    <div className="space-y-6">
      {/* Unlocked achievements */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">
          Megszerzett jelvények ({unlocked.length})
        </h4>
        {unlocked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Még nincs megszerzett jelvényed. Folytasd az írást!
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {unlocked.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                size="md"
              />
            ))}
          </div>
        )}
      </div>

      {/* Locked achievements */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">
          Elérhető jelvények ({locked.length})
        </h4>
        <div className="flex flex-wrap gap-3">
          {locked.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              size="md"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
