import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import type { UserGoals } from "@/types/stats";

interface GoalSettingsProps {
  goals: UserGoals | null;
  onUpdate: (updates: Partial<UserGoals>) => Promise<void>;
}

const GOAL_PRESETS = [
  { value: 250, label: "250 szó", description: "Könnyű tempó" },
  { value: 500, label: "500 szó", description: "Napi rutin" },
  { value: 1000, label: "1.000 szó", description: "Komoly munka" },
  { value: 2000, label: "2.000 szó", description: "Profi tempó" },
];

export function GoalSettings({ goals, onUpdate }: GoalSettingsProps) {
  const [open, setOpen] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(goals?.daily_word_goal || 500);
  const [reminderEnabled, setReminderEnabled] = useState(goals?.reminder_enabled || false);
  const [reminderTime, setReminderTime] = useState(goals?.reminder_time || "09:00");
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(goals?.leaderboard_opt_in || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        daily_word_goal: dailyGoal,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderEnabled ? reminderTime : null,
        leaderboard_opt_in: leaderboardOptIn,
      });
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Célok beállítása
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Írási célok</DialogTitle>
          <DialogDescription>
            Állítsd be a napi szócélodat és az emlékeztetőket
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Daily word goal */}
          <div className="space-y-3">
            <Label>Napi szócél</Label>
            <RadioGroup
              value={dailyGoal.toString()}
              onValueChange={(v) => setDailyGoal(parseInt(v))}
              className="grid grid-cols-2 gap-2"
            >
              {GOAL_PRESETS.map((preset) => (
                <div key={preset.value}>
                  <RadioGroupItem
                    value={preset.value.toString()}
                    id={`goal-${preset.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`goal-${preset.value}`}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <span className="font-semibold">{preset.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {preset.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminder-toggle">Napi emlékeztető</Label>
              <Switch
                id="reminder-toggle"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
              />
            </div>
            {reminderEnabled && (
              <div className="flex items-center gap-2">
                <Label htmlFor="reminder-time" className="text-sm text-muted-foreground">
                  Időpont:
                </Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-32"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Értesítést küldünk, ha még nem írtál aznap
            </p>
          </div>

          {/* Leaderboard */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="leaderboard-toggle">Heti toplista</Label>
              <Switch
                id="leaderboard-toggle"
                checked={leaderboardOptIn}
                onCheckedChange={setLeaderboardOptIn}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Részvétel a heti szószámláló toplistán (anonim megjelenítés)
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Mégse
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Mentés..." : "Mentés"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
