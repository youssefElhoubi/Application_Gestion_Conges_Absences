"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface FormDatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  onDateChange?: (dateString: string) => void;
  quickPresets?: { label: string; daysOffset: number }[];
}

export const FormDatePicker = React.forwardRef<HTMLInputElement, FormDatePickerProps>(
  ({ className, error, value, onChange, onDateChange, quickPresets, min, max, ...props }, ref) => {
    const handleQuickPreset = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const iso = d.toISOString().split("T")[0];
      if (onDateChange) {
        onDateChange(iso);
      }
    };

    return (
      <div className="space-y-1.5 w-full">
        <div className="relative flex items-center w-full">
          <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
            <Calendar className="h-4 w-4" />
          </div>
          <input
            ref={ref}
            type="date"
            value={value}
            min={min}
            max={max}
            onChange={(e) => {
              if (onChange) onChange(e);
              if (onDateChange) onDateChange(e.target.value);
            }}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 py-1 text-sm shadow-xs transition-colors",
              "text-foreground placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...props}
          />
        </div>

        {quickPresets && quickPresets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleQuickPreset(preset.daysOffset)}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-0.5 rounded transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);
FormDatePicker.displayName = "FormDatePicker";
