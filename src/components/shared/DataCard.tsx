import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";

export interface DataCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DataCard({
  title,
  description,
  icon,
  actions,
  footer,
  children,
  className,
  contentClassName,
}: DataCardProps) {
  return (
    <Card className={cn("overflow-hidden flex flex-col", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              {icon}
            </div>
          )}
          <div className="space-y-0.5">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </CardHeader>
      <CardContent className={cn("p-6 flex-1", contentClassName)}>
        {children}
      </CardContent>
      {footer && <CardFooter className="py-3 px-6 bg-muted/30 border-t border-border/40">{footer}</CardFooter>}
    </Card>
  );
}
