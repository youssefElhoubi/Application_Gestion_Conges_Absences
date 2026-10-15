"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/src/components/layout/PageContainer";
import { Alert } from "@/src/components/feedback/Alert";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import { ConfirmDialog } from "@/src/components/shared/ConfirmDialog";
import {
  PublicHolidayDetailsView,
  PublicHolidayModalForm,
  GrantCreditModalForm,
} from "@/src/components/holidays";
import {
  HolidayApiClient,
  PublicHolidayDetail,
  HolidayWorkCreditItem,
  PublicHolidayItem,
} from "@/src/lib/api/holiday-client";
import { EmployeeApiClient, EmployeeListItem } from "@/src/lib/api/employee-client";
import { formatDate } from "@/src/lib/utils";

function PublicHolidayDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const holidayId = params.id as string;

  // Data states
  const [holiday, setHoliday] = React.useState<PublicHolidayDetail | null>(null);
  const [employees, setEmployees] = React.useState<EmployeeListItem[]>([]);
  const [allHolidays, setAllHolidays] = React.useState<PublicHolidayItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Holiday edit modal
  const [holidayModalOpen, setHolidayModalOpen] = React.useState(false);

  // Holiday delete dialog
  const [deleteHolidayConfirmOpen, setDeleteHolidayConfirmOpen] = React.useState(false);
  const [isDeletingHoliday, setIsDeletingHoliday] = React.useState(false);

  // Credit modal (grant / correct)
  const [creditModalOpen, setCreditModalOpen] = React.useState(false);
  const [creditModalMode, setCreditModalMode] = React.useState<"create" | "correct">("create");
  const [selectedCredit, setSelectedCredit] = React.useState<HolidayWorkCreditItem | null>(null);

  // Credit delete dialog
  const [deleteCreditConfirmOpen, setDeleteCreditConfirmOpen] = React.useState(false);
  const [creditToDelete, setCreditToDelete] = React.useState<HolidayWorkCreditItem | null>(null);
  const [isDeletingCredit, setIsDeletingCredit] = React.useState(false);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = React.useState(0);

  // 1. Fetch holiday details and employees
  React.useEffect(() => {
    let isMounted = true;

    Promise.all([
      HolidayApiClient.getHoliday(holidayId),
      EmployeeApiClient.listEmployees({ pageSize: 100 }).catch(() => ({ data: [] })),
      HolidayApiClient.listHolidays({ pageSize: 50 }).catch(() => ({ data: [] })),
    ])
      .then(([holidayData, employeesRes, holidaysRes]) => {
        if (isMounted) {
          setHoliday(holidayData);
          setEmployees(employeesRes.data || []);
          setAllHolidays(holidaysRes.data || []);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement du jour férié.";
          setError(msg);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [holidayId, refreshKey]);

  // Holiday delete handler
  const handleConfirmDeleteHoliday = async () => {
    if (!holiday) return;
    setIsDeletingHoliday(true);
    try {
      await HolidayApiClient.deleteHoliday(holiday.id);
      router.push("/holidays");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression du jour férié.";
      setError(msg);
      setDeleteHolidayConfirmOpen(false);
      setIsDeletingHoliday(false);
    }
  };

  // Credit delete handler
  const handleConfirmDeleteCredit = async () => {
    if (!creditToDelete) return;
    setIsDeletingCredit(true);
    try {
      await HolidayApiClient.deleteCredit(creditToDelete.id);
      setSuccessMessage(
        `Le crédit accordé à ${creditToDelete.employee.fullName} a été révoqué avec succès.`
      );
      setDeleteCreditConfirmOpen(false);
      setCreditToDelete(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la révocation du crédit.";
      setError(msg);
      setDeleteCreditConfirmOpen(false);
    } finally {
      setIsDeletingCredit(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6 py-6 animate-pulse">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-44 rounded-2xl bg-muted/40" />
          <div className="h-64 rounded-2xl bg-muted/30" />
        </div>
      </PageContainer>
    );
  }

  if (error && !holiday) {
    return (
      <PageContainer>
        <ErrorState
          title="Jour férié introuvable"
          message={error}
          secondaryActionLabel="Retourner à la liste"
          onSecondaryAction={() => router.push("/holidays")}
        />
      </PageContainer>
    );
  }

  if (!holiday) return null;

  return (
    <PageContainer>
      <div className="space-y-6 pb-12">
        {/* Alerts */}
        {successMessage && (
          <Alert variant="success" title="Succès" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" title="Erreur" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Detailed View */}
        <PublicHolidayDetailsView
          holiday={holiday}
          onEditHoliday={() => setHolidayModalOpen(true)}
          onDeleteHoliday={() => setDeleteHolidayConfirmOpen(true)}
          onGrantCredit={() => {
            setCreditModalMode("create");
            setSelectedCredit(null);
            setCreditModalOpen(true);
          }}
          onCorrectCredit={(credit) => {
            setCreditModalMode("correct");
            setSelectedCredit(credit);
            setCreditModalOpen(true);
          }}
          onDeleteCredit={(credit) => {
            setCreditToDelete(credit);
            setDeleteCreditConfirmOpen(true);
          }}
        />

        {/* Holiday Edit Modal */}
        <PublicHolidayModalForm
          isOpen={holidayModalOpen}
          mode="edit"
          initialData={holiday}
          onClose={() => setHolidayModalOpen(false)}
          onSuccess={(updated) => {
            setSuccessMessage(`Le jour férié "${updated.label}" a été mis à jour.`);
            setRefreshKey((k) => k + 1);
          }}
        />

        {/* Holiday Delete Confirm */}
        <ConfirmDialog
          isOpen={deleteHolidayConfirmOpen}
          title="Supprimer ce jour férié légal ?"
          description={`Êtes-vous sûr de vouloir supprimer le jour férié "${holiday.label}" du ${formatDate(holiday.date)}? Si des salariés possèdent des crédits de récupération associés, la suppression sera bloquée par mesure de sécurité.`}
          confirmLabel="Supprimer définitivement"
          cancelLabel="Annuler"
          variant="destructive"
          isLoading={isDeletingHoliday}
          onConfirm={handleConfirmDeleteHoliday}
          onClose={() => setDeleteHolidayConfirmOpen(false)}
        />

        {/* Credit Modal (Grant / Correct) */}
        <GrantCreditModalForm
          isOpen={creditModalOpen}
          mode={creditModalMode}
          initialData={selectedCredit}
          defaultHolidayId={holiday.id}
          employees={employees}
          holidays={allHolidays}
          onClose={() => setCreditModalOpen(false)}
          onSuccess={(saved) => {
            setSuccessMessage(
              creditModalMode === "create"
                ? `Crédit de récupération attribué avec succès à ${saved.employee.fullName}.`
                : `Crédit de récupération mis à jour pour ${saved.employee.fullName}.`
            );
            setRefreshKey((k) => k + 1);
          }}
        />

        {/* Credit Delete Confirm */}
        <ConfirmDialog
          isOpen={deleteCreditConfirmOpen}
          title="Révoquer ce crédit de récupération ?"
          description={`Êtes-vous sûr de vouloir révoquer le crédit de ${creditToDelete ? Number(creditToDelete.creditedDays).toFixed(2) : ""} jour(s) accordé à ${creditToDelete?.employee.fullName}? Cette action est définitive.`}
          confirmLabel="Révoquer le crédit"
          cancelLabel="Annuler"
          variant="destructive"
          isLoading={isDeletingCredit}
          onConfirm={handleConfirmDeleteCredit}
          onClose={() => setDeleteCreditConfirmOpen(false)}
        />
      </div>
    </PageContainer>
  );
}

export default function PublicHolidayDetailsPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 py-6 animate-pulse">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-44 rounded-2xl bg-muted/40" />
            <div className="h-64 rounded-2xl bg-muted/30" />
          </div>
        </PageContainer>
      }
    >
      <PublicHolidayDetailsContent />
    </React.Suspense>
  );
}
