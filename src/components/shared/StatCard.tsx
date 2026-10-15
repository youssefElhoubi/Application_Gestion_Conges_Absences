import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  description?: string;
  isLoading?: boolean;
  className?: string;
  valueColor?: "default" | "primary" | "success" | "warning" | "destructive";
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  description,
  isLoading = false,
  className,
  valueColor = "default",
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("p-6 flex flex-col justify-between space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3.5 w-36" />
      </Card>
    );
  }

  const valueColorStyles = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    destructive: "text-rose-600 dark:text-rose-400",
  };

  return (
    <Card className={cn("p-6 flex flex-col justify-between gap-4 transition-all hover:shadow-md hover:border-border/80", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className={cn("text-2xl sm:text-3xl font-bold tracking-tight", valueColorStyles[valueColor])}>
          {value}
        </div>

        {(trend || description) && (
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-sm text-[11px]",
                  trend.direction === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  trend.direction === "down" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                  trend.direction === "neutral" && "bg-muted text-muted-foreground"
                )}
              >
                {trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
                {trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
                {trend.direction === "neutral" && <Minus className="h-3 w-3" />}
                {trend.value}
              </span>
            )}
            {description && (
              <span className="text-muted-foreground truncate">{description}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
