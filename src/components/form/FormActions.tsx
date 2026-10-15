import * as React from "react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

export interface FormActionsProps {
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  onCancel?: () => void;
  secondaryAction?: React.ReactNode;
  align?: "left" | "right" | "between" | "stretch";
  sticky?: boolean;
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  submitLabel = "Enregistrer",
  cancelLabel = "Annuler",
  isSubmitting = false,
  disabled = false,
  onCancel,
  secondaryAction,
  align = "right",
  sticky = false,
  className,
}) => {
  const alignClass = {
    left: "justify-start",
    right: "justify-end",
    between: "justify-between",
    stretch: "flex-col sm:flex-row justify-stretch *:flex-1",
  }[align];

  return (
    <div
      className={cn(
        "flex items-center gap-3 pt-4 border-t border-border mt-6",
        alignClass,
        sticky &&
          "sticky bottom-0 bg-background/95 backdrop-blur-md py-4 px-6 -mx-6 -mb-6 shadow-md z-10",
        className
      )}
    >
      {secondaryAction && <div>{secondaryAction}</div>}

      <div className="flex items-center gap-2.5">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || disabled}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={disabled || isSubmitting}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};
