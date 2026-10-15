import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  fluid?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  fluid = false,
  className,
  children,
  ...props
}) => {
  return (
    <main
      className={cn(
        "flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 sm:space-y-8",
        fluid ? "max-w-none" : "max-w-7xl",
        className
      )}
      {...props}
    >
      {children}
    </main>
  );
};
