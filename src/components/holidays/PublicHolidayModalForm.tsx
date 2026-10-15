"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { FormDatePicker, FormField } from "@/src/components/form";
import { Alert } from "@/src/components/feedback/Alert";
import {
  HolidayApiClient,
  PublicHolidayItem,
} from "@/src/lib/api/holiday-client";

export interface PublicHolidayModalFormProps {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: PublicHolidayItem | null;
  onClose: () => void;
  onSuccess: (holiday: PublicHolidayItem) => void;
}

function PublicHolidayFormContent({
  mode,
  initialData,
  onClose,
  onSuccess,
}: PublicHolidayModalFormProps) {
  const isEdit = mode === "edit";

  const [date, setDate] = React.useState<string>(() => {
    if (isEdit && initialData?.date) {
      return new Date(initialData.date).toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  });

  const [label, setLabel] = React.useState<string>(() => {
    if (isEdit && initialData?.label) return initialData.label;
    return "";
  });

  const [isReligious, setIsReligious] = React.useState<boolean>(() => {
    if (isEdit && initialData) return initialData.isReligious;
    return false;
  });

  const [comment, setComment] = React.useState<string>(() => {
    if (isEdit && initialData?.comment) return initialData.comment;
    return "";
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors: Record<string, string> = {};

    if (!label.trim()) {
      errors.label = "L'intitulé du jour férié est obligatoire.";
    }
    if (!date) {
      errors.date = "La date du jour férié est obligatoire.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      let result: PublicHolidayItem;
      if (isEdit && initialData) {
        result = await HolidayApiClient.updateHoliday(initialData.id, {
          date,
          label: label.trim(),
          isReligious,
          comment: comment.trim() || null,
        });
      } else {
        result = await HolidayApiClient.createHoliday({
          date,
          label: label.trim(),
          isReligious,
          comment: comment.trim() || null,
        });
      }

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement du jour férié.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>
              {isEdit ? "Modifier le jour férié légal" : "Ajouter un jour férié légal"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Mettre à jour la date ou le libellé officiel du jour férié."
                : "Configurer un jour férié chômé et payé selon la législation marocaine (Loi 65-99)."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <Alert variant="destructive" title="Erreur d'enregistrement">
            {error}
          </Alert>
        )}

        {/* Holiday Label */}
        <FormField
          label="Intitulé officiel"
          required
          error={fieldErrors.label}
          description="Ex : Fête du Trône, Fête du Travail, 1er Moharram, Aïd Al-Fitr"
        >
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nom du jour férié..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isSubmitting}
          />
        </FormField>

        {/* Holiday Date */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Date du jour férié <span className="text-rose-500">*</span>
          </label>
          <FormDatePicker
            value={date}
            onDateChange={(val) => setDate(val)}
            disabled={isSubmitting}
          />
          {fieldErrors.date && (
            <p className="text-xs text-rose-500 mt-1">{fieldErrors.date}</p>
          )}
        </div>

        {/* Nature: Religious vs Civil */}
        <div className="rounded-xl border border-border p-3.5 bg-muted/20 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isReligious}
              onChange={(e) => setIsReligious(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">
                Fête religieuse (Calendrier Hégirien)
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Cochez cette case s&apos;il s&apos;agit d&apos;une fête dont la date exacte dépend de l&apos;observation lunaire officielle (ex. Aïd Al-Fitr, Aïd Al-Adha).
              </p>
            </div>
          </label>
        </div>

        {/* Comment / Legal Notes */}
        <FormField
          label="Observations ou note légale"
          hint="Optionnel"
          description="Précisions administratives ou décret d'application"
        >
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Ex : Jour férié chômé et payé dans le secteur privé..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isSubmitting}
          />
        </FormField>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="gap-2"
          >
            {isEdit ? "Enregistrer les modifications" : "Créer le jour férié"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function PublicHolidayModalForm(props: PublicHolidayModalFormProps) {
  if (!props.isOpen) return null;

  return (
    <Dialog isOpen={props.isOpen} onClose={props.onClose} size="md">
      <PublicHolidayFormContent
        key={`${props.mode}-${props.initialData?.id ?? "new"}`}
        {...props}
      />
    </Dialog>
  );
}
