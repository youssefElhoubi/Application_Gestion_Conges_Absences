"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  PlusCircle,
  RotateCcw,
  Clock,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import { SearchInput } from "@/src/components/shared/SearchInput";
import { ConfirmDialog } from "@/src/components/shared/ConfirmDialog";
import { Alert } from "@/src/components/feedback/Alert";
import {
  PublicHolidayTable,
  PublicHolidayModalForm,
} from "@/src/components/holidays";
import {
  HolidayApiClient,
  PublicHolidayItem,
} from "@/src/lib/api/holiday-client";
import { formatDate } from "@/src/lib/utils";

function PublicHolidaysContent() {
  const currentYear = new Date().getFullYear();

  // Filters
  const [selectedYear, setSelectedYear] = React.useState<string>(String(currentYear));
  const [searchQuery, setSearchQuery] = React.useState("");

  // Data & loading
  const [holidays, setHolidays] = React.useState<PublicHolidayItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Modals state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"create" | "edit">("create");
  const [selectedHoliday, setSelectedHoliday] = React.useState<PublicHolidayItem | null>(null);

  // Delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [holidayToDelete, setHolidayToDelete] = React.useState<PublicHolidayItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Fetch holidays when filters change
  React.useEffect(() => {
    let isMounted = true;

    HolidayApiClient.listHolidays({
      year: selectedYear === "ALL" ? undefined : Number(selectedYear),
      search: searchQuery.trim() || undefined,
      pageSize: 50,
    })
      .then((res) => {
        if (isMounted) {
          setHolidays(res.data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur lors du chargement des jours fériés.";
          setError(msg);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedYear, searchQuery, refreshKey]);

  // Handlers
  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedHoliday(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (holiday: PublicHolidayItem) => {
    setModalMode("edit");
    setSelectedHoliday(holiday);
    setModalOpen(true);
  };

  const handleOpenDelete = (holiday: PublicHolidayItem) => {
    setHolidayToDelete(holiday);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!holidayToDelete) return;
    setIsDeleting(true);
    try {
      await HolidayApiClient.deleteHoliday(holidayToDelete.id);
      setSuccessMessage(`Le jour férié "${holidayToDelete.label}" a été supprimé avec succès.`);
      setDeleteConfirmOpen(false);
      setHolidayToDelete(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression du jour férié.";
      setError(msg);
      setDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalSuccess = (saved: PublicHolidayItem) => {
    setSuccessMessage(
      modalMode === "create"
        ? `Le jour férié "${saved.label}" a été créé avec succès.`
        : `Le jour férié "${saved.label}" a été mis à jour.`
    );
    setRefreshKey((k) => k + 1);
  };

  const handleYearChange = (val: string) => {
    setSelectedYear(val);
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
          title="Jours fériés légaux"
          description="Configuration des jours fériés chômés et payés selon la législation marocaine (Loi 65-99). Les jours fériés ne réduisent jamais le solde de congés payés."
          actions={
            <Button onClick={handleOpenCreate} className="gap-2 shadow-xs">
              <PlusCircle className="h-4 w-4" />
              <span>Ajouter un jour férié</span>
            </Button>
          }
        />

        {/* Sub-Navigation Tabs between Holidays and Recovery Credits */}
        <div className="flex border-b border-border/80">
          <Link
            href="/holidays"
            className="border-b-2 border-primary text-primary px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Jours fériés configurés</span>
          </Link>
          <Link
            href="/recovery-credits"
            className="border-b-2 border-transparent text-muted-foreground hover:text-foreground px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors"
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
          <div className="flex-1 max-w-sm">
            <SearchInput
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setIsLoading(true);
              }}
              placeholder="Rechercher par intitulé ou observation..."
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Year Selector */}
            <div className="w-40 sm:w-48">
              <Select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="ALL">Toutes les années</option>
                <option value={String(currentYear + 1)}>Année {currentYear + 1}</option>
                <option value={String(currentYear)}>Année {currentYear} (En cours)</option>
                <option value={String(currentYear - 1)}>Année {currentYear - 1}</option>
                <option value={String(currentYear - 2)}>Année {currentYear - 2}</option>
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

        {/* Holidays Table */}
        <PublicHolidayTable
          holidays={holidays}
          isLoading={isLoading}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
        />

        {/* Create / Edit Modal Form */}
        <PublicHolidayModalForm
          isOpen={modalOpen}
          mode={modalMode}
          initialData={selectedHoliday}
          onClose={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Supprimer ce jour férié légal ?"
          description={`Êtes-vous sûr de vouloir supprimer le jour férié "${holidayToDelete?.label}" prévu le ${holidayToDelete ? formatDate(holidayToDelete.date) : ""}? Cette opération sera bloquée si des salariés possèdent des crédits de récupération liés à cette date.`}
          confirmLabel="Supprimer définitivement"
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

export default function PublicHolidaysPage() {
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
      <PublicHolidaysContent />
    </React.Suspense>
  );
}
