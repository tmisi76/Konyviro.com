interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">
          {current} / {total} hely foglalva
        </span>
        <span className="text-sm font-semibold text-secondary">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Már csak <span className="font-semibold text-secondary">{total - current}</span> hely elérhető!
      </p>
    </div>
  );
}
