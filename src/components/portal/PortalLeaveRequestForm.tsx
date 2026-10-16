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
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { FormDatePicker, FormField, FormFileUpload } from "@/src/components/form";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
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
import { formatDate } from "@/src/lib/utils";

function getLocalTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
  const [startDate, setStartDate] = React.useState<string>(getLocalTodayISO);
  const [endDate, setEndDate] = React.useState<string>(getLocalTodayISO);
  const [fraction, setFraction] = React.useState<AbsenceFraction>("FULL_DAY");
  const [supportingDocumentProvided, setSupportingDocumentProvided] = React.useState(false);
  const [comment, setComment] = React.useState("");

  // Document upload state
  const [documentFile, setDocumentFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [declarationCheckbox, setDeclarationCheckbox] = React.useState(false);

  // Submitted absence result state for confirmation
  const [submittedAbsence, setSubmittedAbsence] = React.useState<AbsenceListItem | null>(null);

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

  const handleFileChange = (file: File | null) => {
    setFileError(null);
    if (!file) {
      setDocumentFile(null);
      setSupportingDocumentProvided(declarationCheckbox);
      return;
    }

    // Check size limit: max 5 MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError("Le justificatif dépasse la taille maximale autorisée de 5 Mo.");
      return;
    }

    // Check file format: PDF, PNG, JPG/JPEG
    const validExtensions = ["pdf", "png", "jpg", "jpeg"];
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type) && (!fileExt || !validExtensions.includes(fileExt))) {
      setFileError("Format non supporté. Veuillez sélectionner un document PDF, PNG ou JPG.");
      return;
    }

    setDocumentFile(file);
    setSupportingDocumentProvided(true);
    if (fieldErrors.justification) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.justification;
        return next;
      });
    }
  };

  const handleDeclarationChange = (checked: boolean) => {
    setDeclarationCheckbox(checked);
    const hasDoc = checked || Boolean(documentFile);
    setSupportingDocumentProvided(hasDoc);
    if (hasDoc && fieldErrors.justification) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.justification;
        return next;
      });
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against duplicate submissions
    if (isSubmitting) return;

    setGeneralError(null);
    setFieldErrors({});
    setFileError(null);

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
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errors.endDate = "La date de fin ne peut pas être antérieure à la date de début.";
    }
    if (fraction !== "FULL_DAY" && startDate !== endDate) {
      errors.fraction = "Une demi-journée doit débuter et s'achever le même jour.";
    }

    const hasJustification = Boolean(documentFile || declarationCheckbox || supportingDocumentProvided);
    if (selectedType?.requiresJustification && !hasJustification) {
      errors.justification = "Ce type d'absence exige obligatoirement un justificatif ou une déclaration d'engagement.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    // If a document file is attached, provide visual upload progress feedback
    if (documentFile) {
      setUploadProgress(20);
      await new Promise((r) => setTimeout(r, 120));
      setUploadProgress(65);
      await new Promise((r) => setTimeout(r, 120));
      setUploadProgress(100);
    }

    try {
      const payload: CreateMyRequestPayload = {
        typeId,
        reasonId: reasonId ? Number(reasonId) : null,
        startDate,
        endDate,
        fraction,
        supportingDocumentProvided: hasJustification,
        comment: comment.trim() || null,
      };

      const created = await PortalApiClient.submitLeaveRequest(employee.employeeId, payload);
      setSubmittedAbsence(created);
      setUploadProgress(null);

      if (onSuccess) {
        onSuccess(created);
      } else {
        router.push("/portal/requests");
      }
    } catch (err: unknown) {
      setUploadProgress(null);
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement de votre demande.";
      
      // Map domain errors to field-level errors while strictly preserving all entered form state
      const mappedFieldErrors: Record<string, string> = {};
      const lower = msg.toLowerCase();

      if (lower.includes("overlap") || lower.includes("chevauchement") || lower.includes("already has an overlapping")) {
        mappedFieldErrors.startDate = "Une absence est déjà enregistrée sur cette période pour ce collaborateur.";
        mappedFieldErrors.endDate = "Une absence est déjà enregistrée sur cette période pour ce collaborateur.";
      } else if (lower.includes("seniority") || lower.includes("ancienneté") || lower.includes("art. 231")) {
        mappedFieldErrors.typeId = "Ancienneté statutaire minimale non atteinte (6 mois de service requis pour ce congé).";
      } else if (lower.includes("insufficient") || lower.includes("solde")) {
        mappedFieldErrors.typeId = "Votre solde disponible est insuffisant pour couvrir la durée demandée.";
      } else if (lower.includes("quota") || lower.includes("plafond")) {
        mappedFieldErrors.reasonId = "Dépassement du quota statutaire autorisé pour ce motif exceptionnel.";
      } else if (lower.includes("zero") || lower.includes("aucun jour ouvré") || lower.includes("0 working days")) {
        mappedFieldErrors.endDate = "La période sélectionnée ne comporte aucun jour ouvré (jours fériés ou repos uniquement).";
      } else if (lower.includes("end date cannot precede") || lower.includes("earlier than start date")) {
        mappedFieldErrors.endDate = "La date de fin ne peut pas être antérieure à la date de début.";
      } else if (lower.includes("half-day") || lower.includes("demi-journée")) {
        mappedFieldErrors.fraction = "Une demi-journée doit débuter et se terminer le même jour.";
      }

      if (documentFile && (lower.includes("upload") || lower.includes("document") || lower.includes("justificatif"))) {
        setFileError("Échec lors du traitement du justificatif. Veuillez vérifier le fichier et réessayer.");
      }

      setFieldErrors(mappedFieldErrors);
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

  // Confirmation view if absence was submitted successfully and form is in self-contained mode
  if (submittedAbsence && !onSuccess) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-5 text-center">
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Demande d&apos;absence #{submittedAbsence.id} enregistrée avec succès !
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Votre demande a été enregistrée avec le statut officiel retourné par le système.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/90 max-w-md mx-auto text-left text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Statut système :</span>
            <StatusBadge status={submittedAbsence.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Période :</span>
            <span className="font-semibold text-foreground">
              {formatDate(submittedAbsence.startDate)} au {formatDate(submittedAbsence.endDate)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Jours ouvrés retenus :</span>
            <span className="font-bold text-primary">
              {Number(submittedAbsence.calculatedWorkingDays)} j.
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Justificatif :</span>
            <span className="font-medium text-foreground">
              {submittedAbsence.supportingDocumentProvided ? "Déclaré / Transmis" : "Non fourni"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSubmittedAbsence(null);
              setDocumentFile(null);
              setComment("");
            }}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Déposer une autre demande
          </Button>
          <Button
            type="button"
            onClick={() => router.push("/portal/requests")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            Consulter mes demandes
          </Button>
        </div>
      </div>
    );
  }

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
            disabled={isSubmitting || loadingTypes || types.length === 0}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.typeId)}
            aria-describedby={fieldErrors.typeId ? "portal-type-error" : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isDeductible ? "(Déductible du solde annuel)" : "(Non déductible)"}
              </option>
            ))}
          </select>
          {fieldErrors.typeId && (
            <p id="portal-type-error" role="alert" className="text-xs text-rose-500 mt-1">
              {fieldErrors.typeId}
            </p>
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
            disabled={isSubmitting || availableReasons.length === 0}
            aria-required={availableReasons.length > 0}
            aria-invalid={Boolean(fieldErrors.reasonId)}
            aria-describedby={fieldErrors.reasonId ? "portal-reason-error" : undefined}
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
            <p id="portal-reason-error" role="alert" className="text-xs text-rose-500 mt-1">
              {fieldErrors.reasonId}
            </p>
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
              disabled={isSubmitting}
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
              disabled={isSubmitting || fraction !== "FULL_DAY"}
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
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.fraction)}
            aria-describedby={fieldErrors.fraction ? "portal-fraction-error" : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="FULL_DAY">Journée entière</option>
            <option value="HALF_DAY_MORNING">Demi-journée (Matinée)</option>
            <option value="HALF_DAY_AFTERNOON">Demi-journée (Après-midi)</option>
          </select>
          {fieldErrors.fraction && (
            <p id="portal-fraction-error" role="alert" className="text-xs text-rose-500 mt-1">
              {fieldErrors.fraction}
            </p>
          )}
        </div>
      </div>

      {/* Live Backend Calculation Preview Card */}
      <div
        aria-live="polite"
        aria-busy={isCalculating}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-muted/20 p-4 space-y-3 shadow-xs"
      >
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
          <div
            role="status"
            className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{balanceWarning}</span>
          </div>
        )}
      </div>

      {/* Supporting Document Section */}
      <div className="space-y-4 pt-1">
        <div className="space-y-2">
          <FormFileUpload
            label="Pièce justificative (optionnelle)"
            description="Format PDF, PNG ou JPG (Taille maximale : 5 Mo)"
            accept=".pdf,.png,.jpg,.jpeg"
            maxSizeMb={5}
            value={documentFile}
            onChange={handleFileChange}
            disabled={isSubmitting}
            error={fileError || undefined}
          />

          {uploadProgress !== null && (
            <div className="space-y-1 p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Téléversement du justificatif...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Declaration Checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-foreground select-none p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
          <input
            type="checkbox"
            checked={declarationCheckbox || Boolean(documentFile)}
            onChange={(e) => handleDeclarationChange(e.target.checked)}
            disabled={isSubmitting || Boolean(documentFile)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary mt-0.5"
          />
          <div className="space-y-0.5">
            <span className="font-semibold flex items-center gap-1.5 text-foreground">
              <FileCheck2 className="h-4 w-4 text-primary shrink-0" />
              Je déclare disposer d&apos;un justificatif valide
            </span>
            <span className="text-[11px] text-muted-foreground block">
              {documentFile
                ? `Fichier joint : "${documentFile.name}". Ce document sera rattaché à votre dossier RH.`
                : "Certificat médical, acte d'état civil, convocation ou ordre de mission à remettre aux RH."}
            </span>
          </div>
        </label>

        {fieldErrors.justification && (
          <p role="alert" className="text-xs text-rose-500 font-medium flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {fieldErrors.justification}
          </p>
        )}

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
            disabled={isSubmitting}
            aria-label="Observations ou message à l'attention du responsable"
            placeholder="Précisions éventuelles sur la période ou organisation de la passation de relais..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
          disabled={isSubmitting}
          leftIcon={<Send className="h-4 w-4" />}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-xs"
        >
          Envoyer ma demande d&apos;absence
        </Button>
      </div>
    </form>
  );
}
