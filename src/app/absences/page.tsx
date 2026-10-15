"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Eye,
  Edit2,
  FileCheck2,
  FileX2,
  ExternalLink,
  CalendarCheck,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  FilterBar,
  ActiveFilter,
} from "@/src/components/shared";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import { DataTable, ColumnDef } from "@/src/components/table/DataTable";
import { Alert } from "@/src/components/feedback/Alert";
import {
  AbsenceApiClient,
  AbsenceListItem,
  AbsenceTypeItem,
  AbsenceStatus,
} from "@/src/lib/api/absence-client";
import { EmployeeApiClient, SiteItem } from "@/src/lib/api/employee-client";
import { AbsenceModalForm } from "@/src/components/absences/AbsenceModalForm";
import {
  ApproveAbsenceDialog,
  RejectAbsenceDialog,
  CancelAbsenceDialog,
} from "@/src/components/absences/AbsenceWorkflowDialogs";
import { formatDate } from "@/src/lib/utils";

function AbsencesDirectoryContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || searchParams.get("employeeId") || "";
  const initialStatus = (searchParams.get("status") as AbsenceStatus | "ALL") || "ALL";

  // Data State
  const [absences, setAbsences] = React.useState<AbsenceListItem[]>([]);
  const [types, setTypes] = React.useState<AbsenceTypeItem[]>([]);
  const [sites, setSites] = React.useState<SiteItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [totalItems, setTotalItems] = React.useState(0);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = React.useState(initialSearch);
  const [selectedStatus, setSelectedStatus] = React.useState<AbsenceStatus | "ALL">(initialStatus);
  const [selectedTypeId, setSelectedTypeId] = React.useState<string>("all");
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>("all");
  const [startDateFilter, setStartDateFilter] = React.useState<string>("");
  const [endDateFilter, setEndDateFilter] = React.useState<string>("");

  React.useEffect(() => {
    const q = searchParams.get("search") || searchParams.get("employeeId") || "";
    if (q) setSearchQuery(q);
    const s = searchParams.get("status") as AbsenceStatus | "ALL" | null;
    if (s) setSelectedStatus(s);
  }, [searchParams]);

  // Modals & Dialogs State
  const [formModalOpen, setFormModalOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [selectedAbsenceForEdit, setSelectedAbsenceForEdit] = React.useState<AbsenceListItem | null>(null);

  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [targetAbsenceForWorkflow, setTargetAbsenceForWorkflow] = React.useState<AbsenceListItem | null>(null);

  const [refreshKey, setRefreshKey] = React.useState(0);

  // Load Reference Data (Sites, Absence Types) on mount
  React.useEffect(() => {
    Promise.all([
      AbsenceApiClient.getAbsenceTypes().catch(() => []),
      EmployeeApiClient.listSites().catch(() => []),
    ]).then(([typesList, sitesList]) => {
      setTypes(typesList);
      setSites(sitesList);
    });
  }, []);

  // Fetch Absences with pagination and filters
  React.useEffect(() => {
    let isMounted = true;

    async function loadAbsences() {
      setIsLoading(true);
      try {
        const res = await AbsenceApiClient.listAbsences({
          page: currentPage,
          pageSize,
          search: searchQuery,
          status: selectedStatus,
          typeId: selectedTypeId !== "all" ? Number(selectedTypeId) : undefined,
          siteId: selectedSiteId !== "all" ? Number(selectedSiteId) : undefined,
          startDate: startDateFilter || undefined,
          endDate: endDateFilter || undefined,
        });

        if (isMounted) {
          setAbsences(res.data);
          setTotalItems(res.meta.totalItems);
          setErrorMessage(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement des absences.";
          setErrorMessage(msg);
          setIsLoading(false);
        }
      }
    }

    loadAbsences();

    return () => {
      isMounted = false;
    };
  }, [
    currentPage,
    pageSize,
    searchQuery,
    selectedStatus,
    selectedTypeId,
    selectedSiteId,
    startDateFilter,
    endDateFilter,
    refreshKey,
  ]);

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  // KPI Calculations
  const pendingCount = React.useMemo(() => {
    return absences.filter((a) => a.status === "PENDING").length;
  }, [absences]);

  const approvedThisMonth = React.useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return absences.filter((a) => {
      if (a.status !== "APPROVED") return false;
      const s = new Date(a.startDate);
      return s.getMonth() === currentMonth && s.getFullYear() === currentYear;
    }).length;
  }, [absences]);

  const activeTodayCount = React.useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    return absences.filter((a) => {
      if (a.status !== "APPROVED") return false;
      const s = new Date(a.startDate).setHours(0, 0, 0, 0);
      const e = new Date(a.endDate).setHours(0, 0, 0, 0);
      return today >= s && today <= e;
    }).length;
  }, [absences]);

  const totalWorkingDaysTaken = React.useMemo(() => {
    return absences
      .filter((a) => a.status === "APPROVED")
      .reduce((acc, curr) => acc + Number(curr.retainedDays || curr.calculatedWorkingDays || 0), 0);
  }, [absences]);

  // Filter Reset
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("ALL");
    setSelectedTypeId("all");
    setSelectedSiteId("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setCurrentPage(1);
  };

  // Active filter pills
  const activeFilters: ActiveFilter[] = React.useMemo(() => {
    const list: ActiveFilter[] = [];
    if (selectedStatus !== "ALL") {
      const labels: Record<string, string> = {
        PENDING: "En attente",
        APPROVED: "Validé",
        REJECTED: "Refusé",
        CANCELLED: "Annulé",
      };
      list.push({ id: "status", label: "Statut", valueLabel: labels[selectedStatus] || selectedStatus });
    }
    if (selectedTypeId !== "all") {
      const foundType = types.find((t) => String(t.id) === selectedTypeId);
      list.push({ id: "type", label: "Type", valueLabel: foundType?.name || selectedTypeId });
    }
    if (selectedSiteId !== "all") {
      const foundSite = sites.find((s) => String(s.id) === selectedSiteId);
      list.push({ id: "site", label: "Site", valueLabel: foundSite?.name || selectedSiteId });
    }
    if (startDateFilter) {
      list.push({ id: "startDate", label: "Depuis le", valueLabel: formatDate(startDateFilter) });
    }
    if (endDateFilter) {
      list.push({ id: "endDate", label: "Jusqu'au", valueLabel: formatDate(endDateFilter) });
    }
    return list;
  }, [selectedStatus, selectedTypeId, selectedSiteId, startDateFilter, endDateFilter, types, sites]);

  const handleRemoveFilter = (filterId: string) => {
    if (filterId === "status") setSelectedStatus("ALL");
    if (filterId === "type") setSelectedTypeId("all");
    if (filterId === "site") setSelectedSiteId("all");
    if (filterId === "startDate") setStartDateFilter("");
    if (filterId === "endDate") setEndDateFilter("");
    setCurrentPage(1);
  };

  // Table Columns Definition
  const columns: ColumnDef<AbsenceListItem>[] = [
    {
      id: "employee",
      header: "Collaborateur",
      cell: (row) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
            {row.employee.fullName
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <Link
              href={`/employees/${encodeURIComponent(row.employee.employeeId)}`}
              className="font-medium text-foreground hover:text-primary transition-colors hover:underline flex items-center gap-1 group text-sm"
            >
              <span>{row.employee.fullName}</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{row.employee.employeeId}</span>
              {row.employee.site && (
                <>
                  <span>•</span>
                  <span>{row.employee.site.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "type",
      header: "Type & Motif",
      cell: (row) => (
        <div className="space-y-0.5 min-w-[150px]">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: row.type.colorHex || "#3b82f6" }}
            />
            <span>{row.type.name}</span>
          </div>
          {row.reason ? (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={row.reason.name}>
              {row.reason.name}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">Aucun motif spécifique</p>
          )}
        </div>
      ),
    },
    {
      id: "period",
      header: "Période",
      cell: (row) => {
        const start = new Date(row.startDate).toLocaleDateString("fr-FR");
        const end = new Date(row.endDate).toLocaleDateString("fr-FR");
        const isSingleDay = start === end;

        return (
          <div className="space-y-0.5 min-w-[140px]">
            <div className="text-sm font-medium text-foreground">
              {isSingleDay ? start : `${start} → ${end}`}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.fraction === "FULL_DAY" ? (
                "Journée entière"
              ) : row.fraction === "HALF_DAY_MORNING" ? (
                <span className="text-sky-600 dark:text-sky-400 font-medium">Demi-journée (Matin)</span>
              ) : (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">Demi-journée (Après-midi)</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "days",
      header: "Jours",
      align: "center",
      cell: (row) => {
        const workingDays = Number(row.retainedDays || row.calculatedWorkingDays);
        return (
          <div className="flex flex-col items-center min-w-[70px]">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-muted text-foreground border border-border">
              {workingDays} {workingDays > 1 ? "jours" : "jour"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              ({row.enteredDays} j. cal.)
            </span>
          </div>
        );
      },
    },
    {
      id: "document",
      header: "Justificatif",
      align: "center",
      cell: (row) => (
        <div className="flex items-center justify-center">
          {row.supportingDocumentProvided ? (
            <span
              className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full"
              title="Justificatif fourni et archivé"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Fourni</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 bg-muted/60 px-2 py-0.5 rounded-full"
              title="Aucun document fourni"
            >
              <FileX2 className="h-3.5 w-3.5" />
              <span>Non fourni</span>
            </span>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Statut",
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5 min-w-[150px]">
          {/* Detail Link */}
          <Link href={`/absences/${encodeURIComponent(String(row.id))}`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              title="Consulter la fiche détaillée"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Détails
            </Button>
          </Link>

          {/* Workflow quick actions for PENDING */}
          {row.status === "PENDING" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTargetAbsenceForWorkflow(row);
                  setApproveDialogOpen(true);
                }}
                className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                title="Valider la demande"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTargetAbsenceForWorkflow(row);
                  setRejectDialogOpen(true);
                }}
                className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800"
                title="Rejeter la demande"
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedAbsenceForEdit(row);
                  setFormMode("edit");
                  setFormModalOpen(true);
                }}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Modifier la demande"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {/* Cancellation allowed for APPROVED */}
          {row.status === "APPROVED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTargetAbsenceForWorkflow(row);
                setCancelDialogOpen(true);
              }}
              className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              title="Annuler le congé"
            >
              Annuler
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Absences & Congés"
        description="Gérez les demandes de congés, examinez les justificatifs et validez les droits à l'absence des collaborateurs."
        breadcrumbs={
          <nav className="flex items-center gap-1.5">
            <Link href="/" className="hover:text-foreground transition-colors">
              Tableau de bord
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Absences</span>
          </nav>
        }
        actions={
          <Button
            onClick={() => {
              setSelectedAbsenceForEdit(null);
              setFormMode("create");
              setFormModalOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
          >
            Nouvelle Demande
          </Button>
        }
      />

      {/* Global Notifications */}
      {successMessage && (
        <Alert
          variant="success"
          title="Opération réussie"
          className="mb-4"
          onDismiss={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert
          variant="destructive"
          title="Erreur"
          className="mb-4"
          onDismiss={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="En attente de validation"
          value={pendingCount}
          description="Demandes nécessitant l'arbitrage RH"
          valueColor={pendingCount > 0 ? "warning" : "default"}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
        />

        <StatCard
          title="Congés en cours aujourd'hui"
          value={activeTodayCount}
          description="Collaborateurs absents ce jour"
          icon={<CalendarCheck className="h-5 w-5 text-primary" />}
        />

        <StatCard
          title="Validées ce mois"
          value={approvedThisMonth}
          description="Demandes confirmées pour le mois en cours"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        />

        <StatCard
          title="Total jours ouvrés pris"
          value={`${totalWorkingDaysTaken} j`}
          description="Consommation totale cumulée"
          icon={<CalendarDays className="h-5 w-5 text-indigo-500" />}
        />
      </div>

      {/* Filter Bar with Search and Multi-criteria filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3 shadow-xs">
        <FilterBar
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Rechercher par nom, matricule ou motif..."
          activeFilters={activeFilters}
          onRemoveFilter={handleRemoveFilter}
          onResetFilters={handleResetFilters}
          totalResults={totalItems}
        >
          {/* Status Filter */}
          <Select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as AbsenceStatus | "ALL");
              setCurrentPage(1);
            }}
            className="w-[140px] text-xs h-9"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Validé</option>
            <option value="REJECTED">Refusé</option>
            <option value="CANCELLED">Annulé</option>
          </Select>

          {/* Absence Type Filter */}
          <Select
            value={selectedTypeId}
            onChange={(e) => {
              setSelectedTypeId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-[160px] text-xs h-9"
          >
            <option value="all">Tous les types</option>
            {types.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </Select>

          {/* Site Filter */}
          <Select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-[130px] text-xs h-9"
          >
            <option value="all">Tous les sites</option>
            {sites.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </Select>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-muted/40 border border-border px-2 py-1 rounded-md text-xs">
            <span className="text-muted-foreground">Du:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs focus:outline-none"
            />
            <span className="text-muted-foreground">Au:</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs focus:outline-none"
            />
          </div>
        </FilterBar>
      </div>

      {/* Absence Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={absences}
          keyExtractor={(row) => String(row.id)}
          isLoading={isLoading}
          page={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          emptyTitle="Aucune demande d'absence trouvée"
          emptyDescription={
            searchQuery || selectedStatus !== "ALL" || selectedTypeId !== "all"
              ? "Aucune absence ne correspond à vos critères de recherche actuels. Essayez de réinitialiser vos filtres."
              : "Il n'y a actuellement aucune demande d'absence enregistrée dans le système."
          }
          emptyActionLabel={
            searchQuery || selectedStatus !== "ALL" || selectedTypeId !== "all"
              ? "Réinitialiser les filtres"
              : "Créer une demande d'absence"
          }
          onEmptyAction={
            searchQuery || selectedStatus !== "ALL" || selectedTypeId !== "all"
              ? handleResetFilters
              : () => {
                  setSelectedAbsenceForEdit(null);
                  setFormMode("create");
                  setFormModalOpen(true);
                }
          }
        />
      </div>

      {/* Create / Edit Modal Form */}
      <AbsenceModalForm
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage(
            formMode === "create"
              ? "La demande d'absence a été soumise avec succès."
              : "La demande d'absence a été modifiée avec succès."
          );
          triggerRefresh();
        }}
        mode={formMode}
        initialData={selectedAbsenceForEdit}
      />

      {/* Approve Dialog */}
      <ApproveAbsenceDialog
        isOpen={approveDialogOpen}
        onClose={() => {
          setApproveDialogOpen(false);
          setTargetAbsenceForWorkflow(null);
        }}
        onSuccess={() => {
          setSuccessMessage("La demande d'absence a été validée avec succès.");
          triggerRefresh();
        }}
        absence={targetAbsenceForWorkflow}
      />

      {/* Reject Dialog */}
      <RejectAbsenceDialog
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setTargetAbsenceForWorkflow(null);
        }}
        onSuccess={() => {
          setSuccessMessage("La demande d'absence a été refusée.");
          triggerRefresh();
        }}
        absence={targetAbsenceForWorkflow}
      />

      {/* Cancel Dialog */}
      <CancelAbsenceDialog
        isOpen={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setTargetAbsenceForWorkflow(null);
        }}
        onSuccess={() => {
          setSuccessMessage("La demande d'absence a été annulée.");
          triggerRefresh();
        }}
        absence={targetAbsenceForWorkflow}
      />
    </PageContainer>
  );
}

export default function AbsencesDirectoryPage() {
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
      <AbsencesDirectoryContent />
    </React.Suspense>
  );
}
