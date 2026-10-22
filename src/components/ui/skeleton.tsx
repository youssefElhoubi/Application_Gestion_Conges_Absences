import * as React from "react";
import { cn } from "@/src/lib/utils";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/80 duration-1000",
        className
      )}
      {...props}
    />
  );
}
