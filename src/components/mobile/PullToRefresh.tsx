import { RefObject } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  containerRef: RefObject<HTMLDivElement>;
  pullDistance: number;
  isRefreshing: boolean;
  isPastThreshold: boolean;
  children: React.ReactNode;
}

export function PullToRefresh({
  containerRef,
  pullDistance,
  isRefreshing,
  isPastThreshold,
  children,
}: PullToRefreshProps) {
  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto overscroll-none">
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center transition-opacity",
          pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: pullDistance || (isRefreshing ? 60 : 0),
          top: 0,
        }}
      >
        {isRefreshing ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <ArrowDown
            className={cn(
              "h-6 w-6 transition-transform text-muted-foreground",
              isPastThreshold && "rotate-180 text-primary"
            )}
          />
        )}
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? "transform 0.3s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
