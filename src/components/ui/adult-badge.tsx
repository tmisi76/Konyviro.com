import { cn } from "@/lib/utils";

interface AdultBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

export function AdultBadge({ size = "sm", className }: AdultBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-pink-200 bg-pink-100 font-bold text-pink-700 dark:border-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        className
      )}
    >
      18+
    </span>
  );
}
