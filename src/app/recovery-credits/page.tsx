"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  Sparkles,
  PlusCircle,
  RotateCcw,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import { SearchInput } from "@/src/components/shared/SearchInput";
import { ConfirmDialog } from "@/src/components/shared/ConfirmDialog";
import { Alert } from "@/src/components/feedback/Alert";
import {
  RecoveryCreditTable,
  GrantCreditModalForm,
} from "@/src/components/holidays";
import {
  HolidayApiClient,
  HolidayWorkCreditItem,
  PublicHolidayItem,
} from "@/src/lib/api/holiday-client";
import { EmployeeApiClient, EmployeeListItem } from "@/src/lib/api/employee-client";

function RecoveryCreditsContent() {
  // Filters
  const [selectedHolidayId, setSelectedHolidayId] = React.useState<string>("ALL");
  const [consumedFilter, setConsumedFilter] = React.useState<"all" | "false" | "true">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Data
  const [credits, setCredits] = React.useState<HolidayWorkCreditItem[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeListItem[]>([]);
  const [holidays, setHolidays] = React.useState<PublicHolidayItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"create" | "correct">("create");
  const [selectedCredit, setSelectedCredit] = React.useState<HolidayWorkCreditItem | null>(null);

  // Delete confirm dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [creditToDelete, setCreditToDelete] = React.useState<HolidayWorkCreditItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Refresh key
  const [refreshKey, setRefreshKey] = React.useState(0);

  // 1. Fetch holidays and employees lists for filters and selectors
  React.useEffect(() => {
    Promise.all([
      HolidayApiClient.listHolidays({ pageSize: 100 }).catch(() => ({ data: [] })),
      EmployeeApiClient.listEmployees({ pageSize: 100 }).catch(() => ({ data: [] })),
    ]).then(([holidaysRes, employeesRes]) => {
      setHolidays(holidaysRes.data || []);
      setEmployees(employeesRes.data || []);
    });
  }, []);

  // 2. Fetch credits when filters or refreshKey change
  React.useEffect(() => {
    let isMounted = true;

    HolidayApiClient.listCredits({
      publicHolidayId: selectedHolidayId === "ALL" ? undefined : Number(selectedHolidayId),
      isFullyConsumed: consumedFilter,
      pageSize: 50,
    })
      .then((res) => {
        if (isMounted) {
          // If search query is present, filter by employee name or comment locally over the page
          let filtered = res.data;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (c) =>
                c.employee.fullName.toLowerCase().includes(q) ||
                c.employeeId.toLowerCase().includes(q) ||
                (c.comment && c.comment.toLowerCase().includes(q))
            );
          }
          setCredits(filtered);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur lors du chargement des crédits.";
          setError(msg);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedHolidayId, consumedFilter, searchQuery, refreshKey]);

  // Handlers
  const handleOpenGrant = () => {
    setModalMode("create");
    setSelectedCredit(null);
    setModalOpen(true);
  };

  const handleOpenCorrect = (credit: HolidayWorkCreditItem) => {
    setModalMode("correct");
    setSelectedCredit(credit);
    setModalOpen(true);
  };

  const handleOpenDelete = (credit: HolidayWorkCreditItem) => {
    setCreditToDelete(credit);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!creditToDelete) return;
    setIsDeleting(true);
    try {
      await HolidayApiClient.deleteCredit(creditToDelete.id);
      setSuccessMessage(
        `Le crédit de récupération accordé à ${creditToDelete.employee.fullName} a été supprimé avec succès.`
      );
      setDeleteConfirmOpen(false);
      setCreditToDelete(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression du crédit.";
      setError(msg);
      setDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalSuccess = (saved: HolidayWorkCreditItem) => {
    setSuccessMessage(
      modalMode === "create"
        ? `Crédit de récupération accordé avec succès à ${saved.employee.fullName}.`
        : `Crédit de récupération ajusté pour ${saved.employee.fullName}.`
    );
    setRefreshKey((k) => k + 1);
  };

  const handleHolidayChange = (val: string) => {
    setSelectedHolidayId(val);
    setIsLoading(true);
  };

  const handleConsumedChange = (val: "all" | "false" | "true") => {
    setConsumedFilter(val);
    setIsLoading(true);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <PageContainer>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          title="Crédits de récupération"
          description="Gestion et suivi des jours de repos compensateur accordés aux collaborateurs ayant travaillé durant les jours fériés légaux. Les crédits n'expirent jamais."
          actions={
            <Button onClick={handleOpenGrant} className="gap-2 shadow-xs">
              <PlusCircle className="h-4 w-4" />
              <span>Attribuer un crédit</span>
            </Button>
          }
        />

        {/* Sub-Navigation Tabs between Holidays and Recovery Credits */}
        <div className="flex border-b border-border/80">
          <Link
            href="/holidays"
            className="border-b-2 border-transparent text-muted-foreground hover:text-foreground px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span>Jours fériés configurés</span>
          </Link>
          <Link
            href="/recovery-credits"
            className="border-b-2 border-primary text-primary px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            <span>Crédits de récupération accordés</span>
          </Link>
        </div>

        {/* Feedback banners */}
        {successMessage && (
          <Alert variant="success" title="Opération réussie" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" title="Erreur" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
          <div className="flex-1 max-w-sm">
            <SearchInput
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setIsLoading(true);
              }}
              placeholder="Rechercher par collaborateur, matricule ou motif..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Public Holiday Filter */}
            <div className="w-44 sm:w-52">
              <Select
                value={selectedHolidayId}
                onChange={(e) => handleHolidayChange(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="ALL">Tous les jours fériés</option>
                {holidays.map((h) => (
                  <option key={String(h.id)} value={String(h.id)}>
                    {h.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Consumed Filter */}
            <div className="w-36 sm:w-44">
              <Select
                value={consumedFilter}
                onChange={(e) => handleConsumedChange(e.target.value as "all" | "false" | "true")}
                className="h-9 text-xs"
              >
                <option value="all">Tous les crédits</option>
                <option value="false">Disponibles uniquement</option>
                <option value="true">Totalement consommés</option>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground shrink-0"
              title="Actualiser les données"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only">Actualiser</span>
            </Button>
          </div>
        </div>

        {/* Table */}
        <RecoveryCreditTable
          credits={credits}
          isLoading={isLoading}
          onCorrect={handleOpenCorrect}
          onDelete={handleOpenDelete}
        />

        {/* Grant / Correct Modal */}
        <GrantCreditModalForm
          isOpen={modalOpen}
          mode={modalMode}
          initialData={selectedCredit}
          employees={employees}
          holidays={holidays}
          onClose={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
        />

        {/* Delete / Revoke Confirm Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Révoquer ce crédit de récupération ?"
          description={`Êtes-vous sûr de vouloir révoquer le crédit accordé à "${creditToDelete?.employee.fullName}" pour le jour férié "${creditToDelete?.publicHoliday?.label}"? Si des jours ont déjà été consommés, la suppression sera bloquée.`}
          confirmLabel="Révoquer le crédit"
          cancelLabel="Annuler"
          variant="destructive"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteConfirmOpen(false)}
        />
      </div>
    </PageContainer>
  );
}

export default function RecoveryCreditsPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 py-6 animate-pulse">
            <div className="h-10 w-64 bg-muted rounded" />
            <div className="h-16 rounded-2xl bg-muted/30" />
            <div className="h-64 rounded-2xl bg-muted/40" />
          </div>
        </PageContainer>
      }
    >
      <RecoveryCreditsContent />
    </React.Suspense>
  );
}
