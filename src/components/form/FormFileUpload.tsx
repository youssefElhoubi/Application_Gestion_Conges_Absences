"use client";

import * as React from "react";
import { UploadCloud, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface FormFileUploadProps {
  label?: string;
  description?: string;
  accept?: string;
  maxSizeMb?: number;
  value?: File | null;
  onChange?: (file: File | null) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const FormFileUpload: React.FC<FormFileUploadProps> = ({
  label,
  description = "PDF, PNG ou JPG (Max 5 Mo)",
  accept = ".pdf,.png,.jpg,.jpeg",
  maxSizeMb = 5,
  value,
  onChange,
  disabled = false,
  error,
  className,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [internalError, setInternalError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const effectiveError = error || internalError;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Check size
    if (file.size > maxSizeMb * 1024 * 1024) {
      setInternalError(`Le fichier dépasse la taille maximale autorisée de ${maxSizeMb} Mo.`);
      return;
    }

    setInternalError(null);
    if (onChange) onChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileInputRef.current) fileInputRef.current.value = "";
    setInternalError(null);
    if (onChange) onChange(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      {label && (
        <span className="text-xs font-semibold text-foreground tracking-wide block">
          {label}
        </span>
      )}

      {value ? (
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{value.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(value.size)}</p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="Supprimer le fichier"
              aria-label="Supprimer le fichier"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
            "border-border/80 hover:border-primary/60 hover:bg-muted/30",
            isDragging && "border-primary bg-primary/5 ring-2 ring-primary/20",
            disabled && "cursor-not-allowed opacity-60 bg-muted/20 border-border/40",
            effectiveError && "border-destructive/80 bg-destructive/5"
          )}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            disabled={disabled}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Cliquez pour téléverser ou glissez-déposez
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}

      {effectiveError && (
        <p role="alert" className="text-xs font-medium text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{effectiveError}</span>
        </p>
      )}
    </div>
  );
};
