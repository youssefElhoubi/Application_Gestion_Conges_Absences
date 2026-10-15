import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  error?: string;
  hint?: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, htmlFor, required, description, error, hint, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
        {(label || hint) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={htmlFor}
                className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-1 cursor-pointer select-none"
              >
                {label}
                {required && <span className="text-destructive font-bold text-sm" aria-hidden="true">*</span>}
              </label>
            )}
            {hint && (
              <span className="text-xs text-muted-foreground">{hint}</span>
            )}
          </div>
        )}

        {children}

        {description && !error && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}

        {error && (
          <p
            role="alert"
            className="text-xs font-medium text-destructive flex items-center gap-1.5 animate-fadeIn"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = "FormField";
