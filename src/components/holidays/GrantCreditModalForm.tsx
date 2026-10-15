"use client";

import * as React from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { FormField } from "@/src/components/form";
import { Alert } from "@/src/components/feedback/Alert";
import {
  HolidayApiClient,
  HolidayWorkCreditItem,
  PublicHolidayItem,
} from "@/src/lib/api/holiday-client";
import { EmployeeListItem } from "@/src/lib/api/employee-client";
import { formatDate } from "@/src/lib/utils";

export interface GrantCreditModalFormProps {
  isOpen: boolean;
  mode: "create" | "correct";
  initialData?: HolidayWorkCreditItem | null;
  defaultHolidayId?: string | number | null;
  employees: EmployeeListItem[];
  holidays: PublicHolidayItem[];
  onClose: () => void;
  onSuccess: (credit: HolidayWorkCreditItem) => void;
}

function GrantCreditFormContent({
  mode,
  initialData,
  defaultHolidayId,
  employees,
  holidays,
  onClose,
  onSuccess,
}: GrantCreditModalFormProps) {
  const isCorrect = mode === "correct";

  // Form State initialized directly from props
  const [employeeId, setEmployeeId] = React.useState<string>(() => {
    if (isCorrect && initialData) return initialData.employeeId;
    return employees[0]?.employeeId || "";
  });

  const [publicHolidayId, setPublicHolidayId] = React.useState<string>(() => {
    if (isCorrect && initialData) return String(initialData.publicHolidayId);
    if (defaultHolidayId) return String(defaultHolidayId);
    return holidays[0] ? String(holidays[0].id) : "";
  });

  const [creditedDays, setCreditedDays] = React.useState<number>(() => {
    if (isCorrect && initialData) return Number(initialData.creditedDays);
    return 1.0;
  });

  const [comment, setComment] = React.useState<string>(() => {
    if (isCorrect && initialData?.comment) return initialData.comment;
    return "";
  });

  const [searchEmployeeQuery, setSearchEmployeeQuery] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Filtered employees for search
  const filteredEmployees = React.useMemo(() => {
    if (!searchEmployeeQuery.trim()) return employees;
    const q = searchEmployeeQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        (e.site?.name && e.site.name.toLowerCase().includes(q))
    );
  }, [employees, searchEmployeeQuery]);

  // Selected Employee & Holiday previews
  const selectedEmployee = React.useMemo(() => {
    return employees.find((e) => e.employeeId === employeeId);
  }, [employees, employeeId]);

  const selectedHoliday = React.useMemo(() => {
    return holidays.find((h) => String(h.id) === String(publicHolidayId));
  }, [holidays, publicHolidayId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors: Record<string, string> = {};

    if (!employeeId) {
      errors.employeeId = "Veuillez sélectionner un collaborateur.";
    }
    if (!publicHolidayId) {
      errors.publicHolidayId = "Veuillez sélectionner un jour férié légal.";
    }
    if (creditedDays <= 0 || creditedDays > 5) {
      errors.creditedDays = "Le nombre de jours crédités doit être compris entre 0.5 et 5 jours.";
    }
    if (isCorrect && !comment.trim()) {
      errors.comment = "Un motif explicatif est obligatoire pour toute correction de crédit.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      let result: HolidayWorkCreditItem;
      if (isCorrect && initialData) {
        result = await HolidayApiClient.correctCredit(initialData.id, {
          creditedDays,
          comment: comment.trim(),
        });
      } else {
        result = await HolidayApiClient.grantCredit({
          employeeId,
          publicHolidayId: Number(publicHolidayId),
          creditedDays,
          comment: comment.trim() || null,
        });
      }

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement du crédit.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>
              {isCorrect ? "Ajuster le crédit de récupération" : "Attribuer un crédit de récupération"}
            </DialogTitle>
            <DialogDescription>
              {isCorrect
                ? "Corriger le nombre de jours crédités avec motif d'audit obligatoire."
                : "Enregistrer la permanence d'un collaborateur durant un jour férié légal chômé."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <Alert variant="destructive" title="Erreur d'attribution">
            {error}
          </Alert>
        )}

        {/* Employee Selection */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Collaborateur ayant travaillé <span className="text-rose-500">*</span>
          </label>

          {isCorrect ? (
            <div className="p-3 rounded-lg border border-border bg-muted/20 text-xs">
              <span className="font-bold text-foreground">
                {selectedEmployee?.fullName || initialData?.employee.fullName}
              </span>
              <span className="text-muted-foreground ml-2 font-mono">
                ({initialData?.employeeId})
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Rechercher par nom, matricule ou site..."
                value={searchEmployeeQuery}
                onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {filteredEmployees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.fullName} ({emp.employeeId}) — {emp.site?.name || "Siège"}
                  </option>
                ))}
              </select>
            </div>
          )}
          {fieldErrors.employeeId && (
            <p className="text-xs text-rose-500 mt-1">{fieldErrors.employeeId}</p>
          )}
        </div>

        {/* Public Holiday Selection */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Jour férié légal concerné <span className="text-rose-500">*</span>
          </label>

          {isCorrect ? (
            <div className="p-3 rounded-lg border border-border bg-muted/20 text-xs">
              <span className="font-bold text-foreground">
                {initialData?.publicHoliday?.label}
              </span>
              {initialData?.publicHoliday?.date && (
                <span className="text-muted-foreground ml-2">
                  ({formatDate(initialData.publicHoliday.date)})
                </span>
              )}
            </div>
          ) : (
            <select
              value={publicHolidayId}
              onChange={(e) => setPublicHolidayId(e.target.value)}
              disabled={isSubmitting || !!defaultHolidayId}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {holidays.map((h) => (
                <option key={String(h.id)} value={String(h.id)}>
                  {h.label} ({formatDate(h.date)}) {h.isReligious ? "— Religieux" : "— Civil"}
                </option>
              ))}
            </select>
          )}
          {fieldErrors.publicHolidayId && (
            <p className="text-xs text-rose-500 mt-1">{fieldErrors.publicHolidayId}</p>
          )}
        </div>

        {/* Credited Days */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Nombre de jours de récupération accordés <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="5"
              value={creditedDays}
              onChange={(e) => setCreditedDays(parseFloat(e.target.value) || 0)}
              disabled={isSubmitting}
              className="w-32 rounded-md border border-input bg-background px-3 py-2 text-xs font-bold text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-xs text-muted-foreground">
              jour(s) récupérable(s) sans date d&apos;expiration
            </span>
          </div>
          {fieldErrors.creditedDays && (
            <p className="text-xs text-rose-500 mt-1">{fieldErrors.creditedDays}</p>
          )}
        </div>

        {/* Comment */}
        <FormField
          label={isCorrect ? "Motif de la correction" : "Commentaire / Réf. permanence"}
          required={isCorrect}
          hint={isCorrect ? undefined : "Optionnel"}
          error={fieldErrors.comment}
          description={
            isCorrect
              ? "Expliquez la raison de l'ajustement pour l'historique d'audit."
              : "Précisions sur la permanence assurée ou la note de service interne."
          }
        >
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder={
              isCorrect
                ? "Ex : Rectification d'erreur de saisie initiale..."
                : "Ex : Permanence technique assurée durant le jour férié légal..."
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isSubmitting}
          />
        </FormField>

        {/* Pre-Submission Confirmation Summary Box */}
        {selectedEmployee && selectedHoliday && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Récapitulatif de l&apos;attribution</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
              <div>
                <span className="font-medium text-foreground">Salarié :</span>{" "}
                {selectedEmployee.fullName} ({selectedEmployee.employeeId})
              </div>
              <div>
                <span className="font-medium text-foreground">Jour férié :</span>{" "}
                {selectedHoliday.label} ({formatDate(selectedHoliday.date)})
              </div>
              <div className="sm:col-span-2">
                <span className="font-medium text-foreground">Crédit accordé :</span>{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {creditedDays} jour(s) de récupération
                </strong>
              </div>
            </div>
          </div>
        )}

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
            {isCorrect ? "Valider la correction" : "Attribuer le crédit"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function GrantCreditModalForm(props: GrantCreditModalFormProps) {
  if (!props.isOpen) return null;

  return (
    <Dialog isOpen={props.isOpen} onClose={props.onClose} size="lg">
      <GrantCreditFormContent
        key={`${props.mode}-${props.initialData?.id ?? "new"}-${props.defaultHolidayId ?? ""}`}
        {...props}
      />
    </Dialog>
  );
}
