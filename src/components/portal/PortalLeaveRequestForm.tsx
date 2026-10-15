"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Sparkles,
  FileCheck2,
  AlertCircle,
  Send,
  Info,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { FormDatePicker, FormField } from "@/src/components/form";
import { Alert } from "@/src/components/feedback/Alert";
import {
  PortalApiClient,
  CreateMyRequestPayload,
} from "@/src/lib/api/portal-client";
import {
  AbsenceTypeItem,
  AbsenceFraction,
  CalculationPreviewResult,
  AbsenceListItem,
} from "@/src/lib/api/absence-client";
import { EmployeeListItem } from "@/src/lib/api/employee-client";

export interface PortalLeaveRequestFormProps {
  employee: EmployeeListItem;
  onSuccess?: (created: AbsenceListItem) => void;
  onCancel?: () => void;
}

export function PortalLeaveRequestForm({
  employee,
  onSuccess,
  onCancel,
}: PortalLeaveRequestFormProps) {
  const router = useRouter();

  // Reference data state
  const [types, setTypes] = React.useState<AbsenceTypeItem[]>([]);
  const [loadingTypes, setLoadingTypes] = React.useState(true);

  // Form inputs state
  const [typeId, setTypeId] = React.useState<number>(1);
  const [reasonId, setReasonId] = React.useState<number | null>(null);
  const [startDate, setStartDate] = React.useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = React.useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [fraction, setFraction] = React.useState<AbsenceFraction>("FULL_DAY");
  const [supportingDocumentProvided, setSupportingDocumentProvided] = React.useState(false);
  const [comment, setComment] = React.useState("");

  // UX & Error state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // Live calculation preview state
  const [calculation, setCalculation] = React.useState<CalculationPreviewResult | null>(null);
  const [isCalculating, setIsCalculating] = React.useState(false);

  // Fetch Absence Types on mount
  React.useEffect(() => {
    let isMounted = true;
    async function loadTypes() {
      try {
        const typesList = await PortalApiClient.getAbsenceTypes();
        if (isMounted) {
          setTypes(typesList);
          if (typesList.length > 0) {
            setTypeId(typesList[0].id);
          }
          setLoadingTypes(false);
        }
      } catch {
        if (isMounted) setLoadingTypes(false);
      }
    }
    loadTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Currently selected type
  const selectedType = React.useMemo(() => {
    return types.find((t) => t.id === Number(typeId));
  }, [types, typeId]);

  const availableReasons = React.useMemo(() => {
    return selectedType?.reasons ?? [];
  }, [selectedType]);

  const handleTypeChange = (newId: number) => {
    setTypeId(newId);
    setReasonId(null);
    if (fieldErrors.typeId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.typeId;
        return next;
      });
    }
  };

  const handleFractionChange = (newFraction: AbsenceFraction) => {
    setFraction(newFraction);
    if (newFraction !== "FULL_DAY") {
      setEndDate(startDate);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (fraction !== "FULL_DAY" || new Date(val) > new Date(endDate)) {
      setEndDate(val);
    }
    if (fieldErrors.startDate || fieldErrors.endDate) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.startDate;
        delete next.endDate;
        return next;
      });
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (fieldErrors.endDate) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.endDate;
        return next;
      });
    }
  };

  // Real-time backend calculation preview
  React.useEffect(() => {
    let isCancelled = false;

    const timer = setTimeout(async () => {
      if (!employee.employeeId || !startDate || !endDate || new Date(endDate) < new Date(startDate)) {
        if (!isCancelled) {
          setCalculation(null);
          setIsCalculating(false);
        }
        return;
      }

      if (!isCancelled) setIsCalculating(true);
      try {
        const preview = await PortalApiClient.previewCalculation({
          employeeId: employee.employeeId,
          startDate,
          endDate,
          fraction,
        });
        if (!isCancelled) {
          setCalculation(preview);
        }
      } catch {
        if (!isCancelled) {
          setCalculation(null);
        }
      } finally {
        if (!isCancelled) {
          setIsCalculating(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [employee.employeeId, startDate, endDate, fraction]);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};

    if (!typeId) {
      errors.typeId = "Veuillez choisir un type de congé.";
    }
    if (availableReasons.length > 0 && !reasonId) {
      errors.reasonId = "Veuillez spécifier le motif correspondant.";
    }
    if (!startDate) {
      errors.startDate = "La date de début est requise.";
    }
    if (!endDate) {
      errors.endDate = "La date de fin est requise.";
    }
    if (new Date(endDate) < new Date(startDate)) {
      errors.endDate = "La date de fin ne peut pas être antérieure à la date de début.";
    }
    if (fraction !== "FULL_DAY" && startDate !== endDate) {
      errors.fraction = "Une demi-journée doit débuter et s'achever le même jour.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateMyRequestPayload = {
        typeId,
        reasonId: reasonId ? Number(reasonId) : null,
        startDate,
        endDate,
        fraction,
        supportingDocumentProvided,
        comment: comment.trim() || null,
      };

      const created = await PortalApiClient.submitLeaveRequest(employee.employeeId, payload);
      if (onSuccess) {
        onSuccess(created);
      } else {
        router.push("/portal/requests");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement de votre demande.";
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Balance warning calculation
  const balanceWarning = React.useMemo(() => {
    if (!calculation || !selectedType?.isDeductible) return null;
    const balance = calculation.currentBalance.netAvailableBalance;
    const requiredDays = calculation.calculatedWorkingDays;
    if (requiredDays > balance) {
      return `Attention : Votre solde annuel disponible (${balance} j) est inférieur aux jours ouvrés demandés (${requiredDays} j). Cette demande risque d'être refusée si votre solde n'est pas suffisant.`;
    }
    return null;
  }, [calculation, selectedType]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {generalError && (
        <Alert variant="destructive" title="Erreur lors de la soumission">
          {generalError}
        </Alert>
      )}

      {/* Employee Identification Card (Non-editable, Locked to Authenticated Employee) */}
      <div className="rounded-xl border border-border bg-muted/30 p-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
            {employee.fullName
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm">{employee.fullName}</div>
            <div className="text-muted-foreground flex items-center gap-1.5">
              <span>Matricule: {employee.employeeId}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {employee.site?.name || "Siège"}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
          <ShieldCheck className="h-3.5 w-3.5" /> Compte authentifié
        </div>
      </div>

      {/* Type & Reason Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="portal-type" className="block text-xs font-semibold text-foreground mb-1.5">
            Type de congé / absence <span className="text-rose-500">*</span>
          </label>
          <select
            id="portal-type"
            value={typeId}
            onChange={(e) => handleTypeChange(Number(e.target.value))}
            disabled={loadingTypes || types.length === 0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isDeductible ? "(Déductible du solde annuel)" : "(Non déductible)"}
              </option>
            ))}
          </select>
          {fieldErrors.typeId && (
            <p className="text-xs text-rose-500 mt-1">{fieldErrors.typeId}</p>
          )}
        </div>

        <div>
          <label htmlFor="portal-reason" className="block text-xs font-semibold text-foreground mb-1.5">
            Motif précis {availableReasons.length > 0 && <span className="text-rose-500">*</span>}
          </label>
          <select
            id="portal-reason"
            value={reasonId ?? ""}
            onChange={(e) => setReasonId(e.target.value ? Number(e.target.value) : null)}
            disabled={availableReasons.length === 0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="">
              {availableReasons.length === 0
                ? "Aucun motif spécifique requis pour ce type"
                : "Sélectionnez le motif (ex: Mariage, Naissance...)"}
            </option>
            {availableReasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (Plafond statutaire: {Number(r.allowedDays)} j)
              </option>
            ))}
          </select>
          {fieldErrors.reasonId && (
            <p className="text-xs text-rose-500 mt-1">{fieldErrors.reasonId}</p>
          )}
        </div>
      </div>

      {/* Type Information Pill */}
      {selectedType && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/60 text-xs text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: selectedType.colorHex || "#3b82f6" }}
          />
          <span>{selectedType.description || selectedType.name}</span>
          {selectedType.requiresJustification && (
            <span className="ml-auto inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              <FileCheck2 className="h-3.5 w-3.5" /> Justificatif obligatoire
            </span>
          )}
        </div>
      )}

      {/* Dates & Fraction Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <FormField
            label="Date de début"
            htmlFor="portal-start-date"
            required
            error={fieldErrors.startDate}
          >
            <FormDatePicker
              id="portal-start-date"
              name="startDate"
              value={startDate}
              onDateChange={handleStartDateChange}
              required
              error={Boolean(fieldErrors.startDate)}
            />
          </FormField>
        </div>

        <div>
          <FormField
            label="Date de fin"
            htmlFor="portal-end-date"
            required
            error={fieldErrors.endDate}
          >
            <FormDatePicker
              id="portal-end-date"
              name="endDate"
              value={endDate}
              onDateChange={handleEndDateChange}
              required
              disabled={fraction !== "FULL_DAY"}
              error={Boolean(fieldErrors.endDate)}
            />
          </FormField>
        </div>

        <div>
          <label htmlFor="portal-fraction" className="block text-xs font-semibold text-foreground mb-1.5">
            Fraction de journée
          </label>
          <select
            id="portal-fraction"
            value={fraction}
            onChange={(e) => handleFractionChange(e.target.value as AbsenceFraction)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="FULL_DAY">Journée entière</option>
            <option value="HALF_DAY_MORNING">Demi-journée (Matinée)</option>
            <option value="HALF_DAY_AFTERNOON">Demi-journée (Après-midi)</option>
          </select>
          {fieldErrors.fraction && (
            <p className="text-xs text-rose-500 mt-1">{fieldErrors.fraction}</p>
          )}
        </div>
      </div>

      {/* Live Backend Calculation Preview Card */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-muted/20 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            Décompte légal de votre absence (Calcul automatique)
          </div>
          {isCalculating && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 animate-spin" /> Calcul...
            </span>
          )}
        </div>

        {calculation ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-background border border-border/60 text-center">
              <div className="text-[11px] text-muted-foreground">Durée calendaire</div>
              <div className="text-base font-extrabold text-foreground mt-0.5">
                {calculation.enteredDays} <span className="text-xs font-normal text-muted-foreground">jours</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-background border border-primary/30 text-center">
              <div className="text-[11px] text-primary font-semibold">Jours ouvrés retenus</div>
              <div className="text-xl font-extrabold text-primary mt-0.5">
                {calculation.calculatedWorkingDays} <span className="text-xs font-normal">j. ouvrés</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-background border border-border/60 text-center">
              <div className="text-[11px] text-muted-foreground">Fériés / Repos exclus</div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {calculation.excludedHolidaysCount} férié(s) • {calculation.excludedWeeklyRestDaysCount} repos
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-background border border-border/60 text-center">
              <div className="text-[11px] text-muted-foreground">Votre solde disponible</div>
              <div className="text-base font-extrabold text-foreground mt-0.5">
                {calculation.currentBalance.netAvailableBalance} <span className="text-xs font-normal text-muted-foreground">j.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic flex items-center gap-1.5 py-1">
            <Info className="h-3.5 w-3.5 text-primary" />
            Choisissez vos dates pour obtenir le décompte légal exact sans calcul manuel.
          </div>
        )}

        {balanceWarning && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{balanceWarning}</span>
          </div>
        )}
      </div>

      {/* Supporting Document Declaration */}
      <div className="space-y-3 pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-foreground select-none p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
          <input
            type="checkbox"
            checked={supportingDocumentProvided}
            onChange={(e) => setSupportingDocumentProvided(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <div className="space-y-0.5">
            <span className="font-semibold flex items-center gap-1.5 text-foreground">
              <FileCheck2 className="h-4 w-4 text-primary" />
              Je déclare disposer d&apos;un justificatif valide (certificat médical, acte d&apos;état civil, etc.)
            </span>
            <span className="text-[11px] text-muted-foreground block">
              À remettre au service RH à votre retour ou par email selon les règles internes.
            </span>
          </div>
        </label>

        {/* Comment field */}
        <div>
          <label htmlFor="portal-comment" className="block text-xs font-semibold text-foreground mb-1.5">
            Observations / Message au responsable
          </label>
          <textarea
            id="portal-comment"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Précisions éventuelles sur la période ou organisation de la passation de relais..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
          leftIcon={<Send className="h-4 w-4" />}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-xs"
        >
          Envoyer ma demande d&apos;absence
        </Button>
      </div>
    </form>
  );
}
