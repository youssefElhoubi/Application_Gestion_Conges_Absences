"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";

export interface SearchInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  showShortcut?: boolean;
}

export function SearchInput({
  value: controlledValue,
  defaultValue = "",
  onChange,
  onSearch,
  placeholder = "Rechercher...",
  debounceMs = 300,
  className,
  showShortcut = false,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState(controlledValue ?? defaultValue);
  const isControlled = controlledValue !== undefined && onChange !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  // Sync internalValue when controlledValue changes from parent
  const [prevControlledValue, setPrevControlledValue] = React.useState(controlledValue);
  if (controlledValue !== undefined && prevControlledValue !== controlledValue) {
    setPrevControlledValue(controlledValue);
    setInternalValue(controlledValue);
  }

  React.useEffect(() => {
    const handler = setTimeout(() => {
      onSearch?.(currentValue);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [currentValue, debounceMs, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    if (!isControlled) {
      setInternalValue(newVal);
    }
    onChange?.(newVal);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("");
    onSearch?.("");
  };

  return (
    <div className={cn("relative flex items-center w-full min-w-[200px]", className)}>
      <Input
        type="text"
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        leftIcon={<Search className="h-4 w-4" />}
        rightIcon={
          <div className="flex items-center gap-1.5">
            {currentValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                aria-label="Effacer la recherche"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {showShortcut && !currentValue && (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border/80 rounded-sm">
                /
              </kbd>
            )}
          </div>
        }
      />
    </div>
  );
}
