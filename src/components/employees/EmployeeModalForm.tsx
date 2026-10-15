"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { FormInput, FormSelect, FormDatePicker } from "@/src/components/form";
import { Alert } from "@/src/components/feedback/Alert";
import { EmployeeApiClient, SiteItem, EmployeeListItem } from "@/src/lib/api/employee-client";
import { createEmployeeAction, updateEmployeeAction } from "@/src/modules/employees/employee.actions";
import { Building2, User, Calendar, FileText } from "lucide-react";

export interface EmployeeModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedEmployee: unknown) => void;
  mode: "create" | "edit";
  initialData?: EmployeeListItem | null;
}

interface FormInnerProps {
  mode: "create" | "edit";
  initialData?: EmployeeListItem | null;
  onClose: () => void;
  onSuccess: (savedEmployee: unknown) => void;
  sites: SiteItem[];
  managerOptions: { value: string; label: string }[];
}

const EmployeeFormInner: React.FC<FormInnerProps> = ({
  mode,
  initialData,
  onClose,
  onSuccess,
  sites,
  managerOptions,
}) => {
  const isEdit = mode === "edit";

  const [formData, setFormData] = React.useState(() => {
    if (isEdit && initialData) {
      return {
        employeeId: initialData.employeeId,
        fullName: initialData.fullName,
        cin: initialData.cin || "",
        cnssNumber: initialData.cnssNumber || "",
        email: initialData.email,
        siteId: String(initialData.siteId || initialData.site?.id || (sites[0]?.id ?? "")),
        jobTitle: initialData.jobTitle || "",
        department: initialData.department || "",
        hireDate: initialData.hireDate ? new Date(initialData.hireDate).toISOString().split("T")[0] : "",
        birthDate: initialData.birthDate ? new Date(initialData.birthDate).toISOString().split("T")[0] : "",
        managerId: initialData.managerId || "",
        observation: initialData.observation || "",
      };
    }
    return {
      employeeId: "",
      fullName: "",
      cin: "",
      cnssNumber: "",
      email: "",
      siteId: sites.length > 0 ? String(sites[0].id) : "",
      jobTitle: "",
      department: "",
      hireDate: new Date().toISOString().split("T")[0],
      birthDate: "",
      managerId: "",
      observation: "",
    };
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!isEdit && !formData.employeeId.trim()) {
      errors.employeeId = "Le matricule est obligatoire (Ex: EMP-0101)";
    }
    if (!formData.fullName.trim()) {
      errors.fullName = "Le nom complet est obligatoire";
    }
    if (!formData.cin.trim()) {
      errors.cin = "Le numéro de CIN est obligatoire (Ex: BE123456)";
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      errors.email = "Une adresse email valide est obligatoire";
    }
    if (!formData.siteId) {
      errors.siteId = "Veuillez sélectionner un site de travail";
    }
    if (!formData.hireDate) {
      errors.hireDate = "La date d'embauche est obligatoire";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setGeneralError(null);

    try {
      if (!isEdit) {
        const createPayload = {
          employeeId: formData.employeeId.trim().toUpperCase(),
          fullName: formData.fullName.trim(),
          cin: formData.cin.trim().toUpperCase(),
          cnssNumber: formData.cnssNumber.trim() || null,
          email: formData.email.trim().toLowerCase(),
          siteId: Number(formData.siteId),
          jobTitle: formData.jobTitle.trim() || null,
          department: formData.department.trim() || null,
          hireDate: new Date(formData.hireDate),
          birthDate: formData.birthDate ? new Date(formData.birthDate) : null,
          managerId: formData.managerId.trim() || null,
          observation: formData.observation.trim() || null,
        };
        const res = await createEmployeeAction(createPayload);
        if (!res.success) {
          throw new Error(res.error);
        }
        onSuccess(res.data);
      } else {
        const updatePayload = {
          fullName: formData.fullName.trim(),
          cin: formData.cin.trim().toUpperCase(),
          cnssNumber: formData.cnssNumber.trim() || null,
          email: formData.email.trim().toLowerCase(),
          siteId: Number(formData.siteId),
          jobTitle: formData.jobTitle.trim() || null,
          department: formData.department.trim() || null,
          hireDate: new Date(formData.hireDate),
          birthDate: formData.birthDate ? new Date(formData.birthDate) : null,
          managerId: formData.managerId.trim() || null,
          observation: formData.observation.trim() || null,
        };
        const res = await updateEmployeeAction(formData.employeeId, updatePayload);
        if (!res.success) {
          throw new Error(res.error);
        }
        onSuccess(res.data);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue lors de l'enregistrement.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>
              {isEdit ? "Modifier la fiche collaborateur" : "Ajouter un nouveau collaborateur"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? `Mise à jour du dossier de ${initialData?.fullName || "l'employé"} (${initialData?.employeeId})`
                : "Enregistrement d'un employé dans le référentiel des ressources humaines"}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {generalError && (
        <Alert variant="destructive" onDismiss={() => setGeneralError(null)}>
          {generalError}
        </Alert>
      )}

      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
        {/* Section 1: Identité */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <User className="h-3.5 w-3.5 text-primary" />
            <span>Identité & Identifiants Légaux</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Matricule Collaborateur"
              required={!isEdit}
              disabled={isEdit}
              placeholder="Ex. EMP-0112"
              value={formData.employeeId}
              onChange={(e) => handleChange("employeeId", e.target.value)}
              error={fieldErrors.employeeId}
              description={isEdit ? "Le matricule unique ne peut être modifié." : "Identifiant unique interne"}
            />

            <FormInput
              label="Nom complet"
              required
              placeholder="Ex. Karim Alami"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              error={fieldErrors.fullName}
            />

            <FormInput
              label="N° CIN"
              required
              placeholder="Ex. BE789123"
              value={formData.cin}
              onChange={(e) => handleChange("cin", e.target.value)}
              error={fieldErrors.cin}
              description="Carte d'Identité Nationale"
            />

            <FormInput
              label="N° CNSS"
              placeholder="Ex. 109823412"
              value={formData.cnssNumber}
              onChange={(e) => handleChange("cnssNumber", e.target.value)}
              error={fieldErrors.cnssNumber}
              description="Sécurité Sociale marocaine (Optionnel)"
            />
          </div>

          <FormInput
            label="Adresse Email Professionnelle"
            required
            type="email"
            placeholder="Ex. k.alami@entreprise.ma"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={fieldErrors.email}
          />
        </div>

        {/* Section 2: Organisation & Affectation */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>Affectation & Organisation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Site de travail"
              required
              value={formData.siteId}
              onChange={(e) => handleChange("siteId", e.target.value)}
              error={fieldErrors.siteId}
              options={[
                { value: "", label: "Sélectionner un site..." },
                ...sites.map((s) => ({
                  value: String(s.id),
                  label: `${s.name} (${s.city || "Maroc"})`,
                })),
              ]}
              description="Détermine le calendrier des jours fériés et repos"
            />

            <FormInput
              label="Département"
              placeholder="Ex. Ingénierie & Tech"
              value={formData.department}
              onChange={(e) => handleChange("department", e.target.value)}
            />

            <FormInput
              label="Intitulé du poste"
              placeholder="Ex. Développeur Fullstack"
              value={formData.jobTitle}
              onChange={(e) => handleChange("jobTitle", e.target.value)}
            />

            <FormSelect
              label="Responsable hiérarchique"
              value={formData.managerId}
              onChange={(e) => handleChange("managerId", e.target.value)}
              options={[
                { value: "", label: "Aucun manager direct (Direction)" },
                ...managerOptions,
              ]}
              description="Valideur des demandes d'absence"
            />
          </div>
        </div>

        {/* Section 3: Dates & Ancienneté */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Dates Clés & Calculs Statutaires</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-1 mb-1.5">
                Date d&apos;embauche <span className="text-destructive font-bold text-sm">*</span>
              </label>
              <FormDatePicker
                value={formData.hireDate}
                onDateChange={(val) => handleChange("hireDate", val)}
                error={!!fieldErrors.hireDate}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Point de départ pour l&apos;ancienneté et l&apos;acquisition des congés (Loi 65-99).
              </p>
              {fieldErrors.hireDate && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.hireDate}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground tracking-wide block mb-1.5">
                Date de naissance
              </label>
              <FormDatePicker
                value={formData.birthDate}
                onDateChange={(val) => handleChange("birthDate", val)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Utilisé pour appliquer le taux légal des salariés mineurs (&lt; 18 ans : 2 j/mois).
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Observations */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Observations & Notes RH</span>
          </div>

          <textarea
            value={formData.observation}
            onChange={(e) => handleChange("observation", e.target.value)}
            placeholder="Notes confidentielles, compétences spécifiques ou clauses particulières..."
            rows={3}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {isEdit ? "Enregistrer les modifications" : "Créer le collaborateur"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const EmployeeModalForm: React.FC<EmployeeModalFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
  initialData,
}) => {
  const [sites, setSites] = React.useState<SiteItem[]>([]);
  const [managerOptions, setManagerOptions] = React.useState<{ value: string; label: string }[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      EmployeeApiClient.listSites()
        .then((s) => setSites(s))
        .catch(() => {});

      EmployeeApiClient.listEmployees({ pageSize: 50, active: "true" })
        .then((res) => {
          const opts = res.data
            .filter((e) => mode !== "edit" || e.employeeId !== initialData?.employeeId)
            .map((e) => ({
              value: e.employeeId,
              label: `${e.fullName} (${e.employeeId} - ${e.jobTitle || "Collaborateur"})`,
            }));
          setManagerOptions(opts);
        })
        .catch(() => {});
    }
  }, [isOpen, mode, initialData?.employeeId]);

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <EmployeeFormInner
        key={initialData?.employeeId ? `edit-${initialData.employeeId}` : "create-new"}
        mode={mode}
        initialData={initialData}
        onClose={onClose}
        onSuccess={onSuccess}
        sites={sites}
        managerOptions={managerOptions}
      />
    </Dialog>
  );
};
