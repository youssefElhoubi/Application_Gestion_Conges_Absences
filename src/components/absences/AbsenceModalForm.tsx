"use client";

import * as React from "react";
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
  AbsenceApiClient,
  AbsenceTypeItem,
  AbsenceListItem,
  AbsenceDetail,
  CalculationPreviewResult,
  AbsenceFraction,
} from "@/src/lib/api/absence-client";
import { EmployeeApiClient, EmployeeListItem } from "@/src/lib/api/employee-client";
import {
  Clock,
  FileCheck2,
  AlertCircle,
  Sparkles,
  Info,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

function getLocalTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface AbsenceModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (absence: AbsenceListItem) => void;
  mode: "create" | "edit";
  initialData?: AbsenceListItem | AbsenceDetail | null;
  defaultEmployeeId?: string;
}

interface FormInnerProps {
  mode: "create" | "edit";
  initialData?: AbsenceListItem | AbsenceDetail | null;
  defaultEmployeeId?: string;
  onClose: () => void;
  onSuccess: (absence: AbsenceListItem) => void;
  types: AbsenceTypeItem[];
  employees: EmployeeListItem[];
}

const AbsenceFormInner: React.FC<FormInnerProps> = ({
  mode,
  initialData,
  defaultEmployeeId,
  onClose,
  onSuccess,
  types,
  employees,
}) => {
  const isEdit = mode === "edit";

  // Form State
  const [employeeId, setEmployeeId] = React.useState(() => {
    if (isEdit && initialData) return initialData.employeeId;
    if (defaultEmployeeId) return defaultEmployeeId;
    return employees[0]?.employeeId || "";
  });

  const [typeId, setTypeId] = React.useState<number>(() => {
    if (isEdit && initialData) return initialData.typeId;
    return types[0]?.id || 1;
  });

  const [reasonId, setReasonId] = React.useState<number | null>(() => {
    if (isEdit && initialData) return initialData.reasonId ?? null;
    return null;
  });

  const [startDate, setStartDate] = React.useState<string>(() => {
    if (isEdit && initialData?.startDate) {
      return new Date(initialData.startDate).toISOString().split("T")[0];
    }
    return getLocalTodayISO();
  });

  const [endDate, setEndDate] = React.useState<string>(() => {
    if (isEdit && initialData?.endDate) {
      return new Date(initialData.endDate).toISOString().split("T")[0];
    }
    return getLocalTodayISO();
  });

  const [fraction, setFraction] = React.useState<AbsenceFraction>(() => {
    if (isEdit && initialData?.fraction) return initialData.fraction;
    return "FULL_DAY";
  });

  const [supportingDocumentProvided, setSupportingDocumentProvided] = React.useState<boolean>(() => {
    if (isEdit && initialData) return initialData.supportingDocumentProvided;
    return false;
  });

  const [comment, setComment] = React.useState<string>(() => {
    if (isEdit && initialData?.comment) return initialData.comment;
    return "";
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Calculation preview state
  const [calculation, setCalculation] = React.useState<CalculationPreviewResult | null>(null);
  const [isCalculating, setIsCalculating] = React.useState(false);

  // Active selected type & available reasons
  const selectedType = React.useMemo(() => {
    return types.find((t) => t.id === Number(typeId));
  }, [types, typeId]);

  const availableReasons = React.useMemo(() => {
    return selectedType?.reasons ?? [];
  }, [selectedType]);

  // Handle Type Change
  const handleTypeChange = (newTypeId: number) => {
    setTypeId(newTypeId);
    setReasonId(null);
    if (fieldErrors.typeId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.typeId;
        return next;
      });
    }
  };

  // Handle Fraction Change
  const handleFractionChange = (newFraction: AbsenceFraction) => {
    setFraction(newFraction);
    if (newFraction !== "FULL_DAY") {
      setEndDate(startDate);
    }
  };

  // Handle Start Date Change
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

  // Handle End Date Change
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
      if (!employeeId || !startDate || !endDate || new Date(endDate) < new Date(startDate)) {
        if (!isCancelled) {
          setCalculation(null);
          setIsCalculating(false);
        }
        return;
      }

      if (!isCancelled) setIsCalculating(true);
      try {
        const preview = await AbsenceApiClient.previewCalculation({
          employeeId,
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
  }, [employeeId, startDate, endDate, fraction]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setGeneralError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};

    if (!employeeId) {
      errors.employeeId = "Le collaborateur est obligatoire.";
    }
    if (!typeId) {
      errors.typeId = "Le type d'absence est obligatoire.";
    }
    if (availableReasons.length > 0 && !reasonId) {
      errors.reasonId = "Veuillez sélectionner un motif précis pour ce type de congé.";
    }
    if (!startDate) {
      errors.startDate = "La date de début est obligatoire.";
    }
    if (!endDate) {
      errors.endDate = "La date de fin est obligatoire.";
    }
    if (new Date(endDate) < new Date(startDate)) {
      errors.endDate = "La date de fin ne peut pas être antérieure à la date de début.";
    }
    if (fraction !== "FULL_DAY" && startDate !== endDate) {
      errors.fraction = "Une demi-journée doit commencer et se terminer le même jour.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        employeeId,
        typeId,
        reasonId: reasonId ? Number(reasonId) : null,
        startDate,
        endDate,
        fraction,
        supportingDocumentProvided,
        comment: comment.trim() || null,
      };

      let result: AbsenceListItem;
      if (isEdit && initialData) {
        result = await AbsenceApiClient.updateAbsence(initialData.id, payload);
      } else {
        result = await AbsenceApiClient.createAbsence(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement.";
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Warning when balance might be exceeded
  const balanceWarning = React.useMemo(() => {
    if (!calculation || !selectedType?.isDeductible) return null;
    const balance = calculation.currentBalance.netAvailableBalance;
    const requiredDays = calculation.calculatedWorkingDays;
    if (requiredDays > balance) {
      return `Attention: Le solde disponible (${balance} j) est inférieur aux jours ouvrés demandés (${requiredDays} j). La validation statutaire sera bloquée si le solde est insuffisant.`;
    }
    return null;
  }, [calculation, selectedType]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && (
        <Alert variant="destructive" title="Erreur de validation">
          {generalError}
        </Alert>
      )}

      {/* Employee Selector */}
      <div>
        <label htmlFor="absence-employee" className="block text-xs font-semibold text-foreground mb-1.5">
          Collaborateur concerné <span className="text-rose-500">*</span>
        </label>
        {isEdit && initialData ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/60 border border-border text-sm font-medium">
            <span className="font-semibold text-foreground">{initialData.employee.fullName}</span>
            <span className="text-xs text-muted-foreground">({initialData.employee.employeeId})</span>
          </div>
        ) : (
          <select
            id="absence-employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={isEdit || employees.length === 0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {employees.map((emp) => (
              <option key={emp.employeeId} value={emp.employeeId}>
                {emp.fullName} ({emp.employeeId}) — {emp.site?.name || "Siège"}
              </option>
            ))}
          </select>
        )}
        {fieldErrors.employeeId && (
          <p className="text-xs text-rose-500 mt-1">{fieldErrors.employeeId}</p>
        )}
      </div>

      {/* Type & Reason Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="absence-type" className="block text-xs font-semibold text-foreground mb-1.5">
            Type d&apos;absence <span className="text-rose-500">*</span>
          </label>
          <select
            id="absence-type"
            value={typeId}
            onChange={(e) => handleTypeChange(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isDeductible ? "(Déductible)" : "(Non déductible)"}
              </option>
            ))}
          </select>
          {fieldErrors.typeId && (
            <p className="text-xs text-rose-500 mt-1">{fieldErrors.typeId}</p>
          )}
        </div>

        <div>
          <label htmlFor="absence-reason" className="block text-xs font-semibold text-foreground mb-1.5">
            Motif statutaire {availableReasons.length > 0 && <span className="text-rose-500">*</span>}
          </label>
          <select
            id="absence-reason"
            value={reasonId ?? ""}
            onChange={(e) => setReasonId(e.target.value ? Number(e.target.value) : null)}
            disabled={availableReasons.length === 0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="">
              {availableReasons.length === 0
                ? "Aucun motif spécifique requis"
                : "Sélectionnez un motif..."}
            </option>
            {availableReasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({Number(r.allowedDays)} jours max)
              </option>
            ))}
          </select>
          {fieldErrors.reasonId && (
            <p className="text-xs text-rose-500 mt-1">{fieldErrors.reasonId}</p>
          )}
        </div>
      </div>

      {/* Type badge / tip */}
      {selectedType && (
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30 border border-border/60 text-xs text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: selectedType.colorHex || "#3b82f6" }}
          />
          <span>{selectedType.description || selectedType.name}</span>
          {selectedType.requiresJustification && (
            <span className="ml-auto inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              <FileCheck2 className="h-3.5 w-3.5" /> Justificatif requis
            </span>
          )}
        </div>
      )}

      {/* Dates & Fraction Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <FormField
            label="Date de début"
            htmlFor="absence-start-date"
            required
            error={fieldErrors.startDate}
          >
            <FormDatePicker
              id="absence-start-date"
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
            htmlFor="absence-end-date"
            required
            error={fieldErrors.endDate}
          >
            <FormDatePicker
              id="absence-end-date"
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
          <label htmlFor="absence-fraction" className="block text-xs font-semibold text-foreground mb-1.5">
            Fraction de journée
          </label>
          <select
            id="absence-fraction"
            value={fraction}
            onChange={(e) => handleFractionChange(e.target.value as AbsenceFraction)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="FULL_DAY">Journée entière</option>
            <option value="HALF_DAY_MORNING">Demi-journée (Matin)</option>
            <option value="HALF_DAY_AFTERNOON">Demi-journée (Après-midi)</option>
          </select>
          {fieldErrors.fraction && (
            <p className="text-xs text-rose-500 mt-1">{fieldErrors.fraction}</p>
          )}
        </div>
      </div>

      {/* Live Calculation Preview Card (authoritative backend response) */}
      <div className="rounded-lg border border-border bg-gradient-to-br from-card to-muted/20 p-3.5 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            Décompte légal en temps réel (Moteur backend)
          </div>
          {isCalculating && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 animate-spin" /> Calcul en cours...
            </span>
          )}
        </div>

        {calculation ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-background/80 border border-border/50">
              <div className="text-muted-foreground text-[11px]">Jours demandés</div>
              <div className="text-base font-bold text-foreground">
                {calculation.enteredDays} <span className="text-xs font-normal text-muted-foreground">j. cal.</span>
              </div>
            </div>

            <div className="p-2 rounded bg-background/80 border border-border/50">
              <div className="text-muted-foreground text-[11px]">Jours ouvrés nets</div>
              <div className="text-base font-bold text-primary">
                {calculation.calculatedWorkingDays} <span className="text-xs font-normal text-muted-foreground">j. ouvrés</span>
              </div>
            </div>

            <div className="p-2 rounded bg-background/80 border border-border/50">
              <div className="text-muted-foreground text-[11px]">Fériés / Repos exclus</div>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {calculation.excludedHolidaysCount} férié(s) / {calculation.excludedWeeklyRestDaysCount} repos
              </div>
            </div>

            <div className="p-2 rounded bg-background/80 border border-border/50">
              <div className="text-muted-foreground text-[11px]">Solde annuel restant</div>
              <div className="text-base font-bold text-foreground">
                {calculation.currentBalance.netAvailableBalance} <span className="text-xs font-normal text-muted-foreground">jours</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic flex items-center gap-1.5 py-1">
            <Info className="h-3.5 w-3.5" />
            Sélectionnez les dates pour calculer le décompte légal des jours ouvrés.
          </div>
        )}

        {balanceWarning && (
          <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{balanceWarning}</span>
          </div>
        )}
      </div>

      {/* Supporting Document & Comments */}
      <div className="space-y-3 pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-foreground select-none">
          <input
            type="checkbox"
            checked={supportingDocumentProvided}
            onChange={(e) => setSupportingDocumentProvided(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Justificatif physique ou numérique fourni (certificat médical, acte d&apos;état civil...)
          </span>
        </label>

        <div>
          <label htmlFor="absence-comment" className="block text-xs font-semibold text-foreground mb-1.5">
            Observations / Justification
          </label>
          <textarea
            id="absence-comment"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Informations complémentaires, précisions sur la période..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        >
          {isEdit ? "Enregistrer les modifications" : "Créer la demande d'absence"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export function AbsenceModalForm({
  isOpen,
  onClose,
  onSuccess,
  mode,
  initialData,
  defaultEmployeeId,
}: AbsenceModalFormProps) {
  const [types, setTypes] = React.useState<AbsenceTypeItem[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeListItem[]>([]);
  const [loadingMetadata, setLoadingMetadata] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    if (!isOpen) return;

    async function loadMetadata() {
      try {
        const [typesData, empData] = await Promise.all([
          AbsenceApiClient.getAbsenceTypes(),
          EmployeeApiClient.listEmployees({ pageSize: 100, active: "true" }),
        ]);
        if (active) {
          setTypes(typesData);
          setEmployees(empData.data);
          setLoadingMetadata(false);
        }
      } catch {
        if (active) {
          setLoadingMetadata(false);
        }
      }
    }

    loadMetadata();

    return () => {
      active = false;
    };
  }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div>
            <DialogTitle>
              {mode === "create" ? "Nouvelle demande d'absence" : "Modifier la demande d'absence"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Saisie d'une absence avec décompte légal des jours ouvrés et vérification des soldes."
                : "Mise à jour des informations pour la demande d'absence en attente."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {loadingMetadata ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
          <Clock className="h-6 w-6 animate-spin text-primary" />
          <span>Chargement du référentiel des absences et collaborateurs...</span>
        </div>
      ) : (
        <AbsenceFormInner
          key={initialData ? String(initialData.id) : "new-absence-modal"}
          mode={mode}
          initialData={initialData}
          defaultEmployeeId={defaultEmployeeId}
          onClose={onClose}
          onSuccess={onSuccess}
          types={types}
          employees={employees}
        />
      )}
    </Dialog>
  );
}
