import * as React from "react";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Table Header Skeleton */}
      <div className="flex items-center gap-4 px-4 py-3 bg-muted/40 rounded-t-lg border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Table Rows Skeleton */}
      <div className="divide-y divide-border border-b border-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4 flex-1", c === 0 ? "w-1/4" : "w-auto")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface CardGridSkeletonProps {
  count?: number;
  className?: string;
}

export function CardGridSkeleton({ count = 4, className }: CardGridSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 w-full animate-pulse">
      {/* Header */}
      <div className="space-y-2 border-b border-border pb-6">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats Cards */}
      <CardGridSkeleton count={4} />

      {/* Content Area */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-48" />
        </div>
        <TableSkeleton rows={5} columns={5} />
      </div>
    </div>
  );
}

export const LoadingSkeleton = {
  Table: TableSkeleton,
  Grid: CardGridSkeleton,
  Page: PageSkeleton,
};
