"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  UserX,
  Building2,
  Plus,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  Download,
  MapPin,
  ExternalLink,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  FilterBar,
  ActiveFilter,
  ConfirmDialog,
} from "@/src/components/shared";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import { Badge } from "@/src/components/ui/badge";
import { DataTable, ColumnDef } from "@/src/components/table/DataTable";
import { Alert } from "@/src/components/feedback/Alert";
import {
  EmployeeApiClient,
  EmployeeListItem,
  SiteItem,
} from "@/src/lib/api/employee-client";
import { toggleEmployeeActiveAction } from "@/src/modules/employees/employee.actions";
import { EmployeeModalForm } from "@/src/components/employees/EmployeeModalForm";
import { formatDate } from "@/src/lib/utils";

export default function EmployeesListPage() {
  const router = useRouter();

  // State
  const [employees, setEmployees] = React.useState<EmployeeListItem[]>([]);
  const [sites, setSites] = React.useState<SiteItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<"all" | "true" | "false">("all");
  const [selectedDept, setSelectedDept] = React.useState<string>("all");

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<(string | number)[]>([]);

  // Modals
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"create" | "edit">("create");
  const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeeListItem | null>(null);

  // Confirm Status Dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [targetEmployeeForStatus, setTargetEmployeeForStatus] = React.useState<EmployeeListItem | null>(null);
  const [statusToggling, setStatusToggling] = React.useState(false);

  // Fetch sites on mount
  React.useEffect(() => {
    EmployeeApiClient.listSites()
      .then((s) => setSites(s))
      .catch(() => {});
  }, []);

  // Fetch employees
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchList() {
      try {
        const res = await EmployeeApiClient.listEmployees({
          pageSize: 100,
          search: searchQuery,
          siteId: selectedSiteId !== "all" ? selectedSiteId : undefined,
          active: selectedStatus !== "all" ? selectedStatus : undefined,
          department: selectedDept !== "all" ? selectedDept : undefined,
        });
        if (isMounted) {
          setEmployees(res.data);
          setErrorMessage(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement des collaborateurs.";
          setErrorMessage(msg);
          setIsLoading(false);
        }
      }
    }

    fetchList();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedSiteId, selectedStatus, selectedDept, refreshKey]);

  const reloadEmployees = () => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  // Derived metrics for StatCards
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.active).length;
  const inactiveEmployees = employees.filter((e) => !e.active).length;
  const uniqueSitesCount = new Set(employees.map((e) => e.siteId)).size;

  // Unique departments for filter
  const departments = React.useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Active filter tags
  const activeFilters = React.useMemo(() => {
    const list: ActiveFilter[] = [];
    if (selectedSiteId !== "all") {
      const s = sites.find((x) => String(x.id) === selectedSiteId);
      list.push({ id: "site", label: "Site", valueLabel: s ? s.name : selectedSiteId });
    }
    if (selectedStatus !== "all") {
      list.push({
        id: "status",
        label: "Statut",
        valueLabel: selectedStatus === "true" ? "Actif" : "Inactif",
      });
    }
    if (selectedDept !== "all") {
      list.push({ id: "dept", label: "Département", valueLabel: selectedDept });
    }
    return list;
  }, [selectedSiteId, selectedStatus, selectedDept, sites]);

  const handleRemoveFilter = (filterId: string) => {
    if (filterId === "site") setSelectedSiteId("all");
    if (filterId === "status") setSelectedStatus("all");
    if (filterId === "dept") setSelectedDept("all");
  };

  const handleResetAllFilters = () => {
    setSearchQuery("");
    setSelectedSiteId("all");
    setSelectedStatus("all");
    setSelectedDept("all");
  };

  // Open Edit Modal
  const handleEdit = (emp: EmployeeListItem) => {
    setSelectedEmployee(emp);
    setModalMode("edit");
    setModalOpen(true);
  };

  // Open Create Modal
  const handleCreate = () => {
    setSelectedEmployee(null);
    setModalMode("create");
    setModalOpen(true);
  };

  // Prompt Toggle Status
  const handlePromptToggleStatus = (emp: EmployeeListItem) => {
    setTargetEmployeeForStatus(emp);
    setConfirmDialogOpen(true);
  };

  const handleExecuteToggleStatus = async () => {
    if (!targetEmployeeForStatus) return;
    setStatusToggling(true);
    try {
      const newStatus = !targetEmployeeForStatus.active;
      const res = await toggleEmployeeActiveAction(targetEmployeeForStatus.employeeId, newStatus);
      if (!res.success) {
        throw new Error(res.error);
      }
      setSuccessMessage(
        `Le collaborateur ${targetEmployeeForStatus.fullName} est désormais ${newStatus ? "Actif" : "Inactif"}.`
      );
      setConfirmDialogOpen(false);
      reloadEmployees();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de modifier le statut.";
      setErrorMessage(msg);
    } finally {
      setStatusToggling(false);
    }
  };

  // Batch Export CSV
  const handleExportCSV = () => {
    const rowsToExport =
      selectedIds.length > 0
        ? employees.filter((e) => selectedIds.includes(e.employeeId))
        : employees;

    const headers = [
      "Matricule",
      "Nom complet",
      "CIN",
      "CNSS",
      "Email",
      "Site",
      "Département",
      "Poste",
      "Date d embauche",
      "Statut",
    ];

    const csvContent = [
      headers.join(";"),
      ...rowsToExport.map((e) =>
        [
          e.employeeId,
          `"${e.fullName}"`,
          e.cin,
          e.cnssNumber || "",
          e.email,
          `"${e.site?.name || ""}"`,
          `"${e.department || ""}"`,
          `"${e.jobTitle || ""}"`,
          e.hireDate ? new Date(e.hireDate).toISOString().split("T")[0] : "",
          e.active ? "Actif" : "Inactif",
        ].join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collaborateurs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Table Column Definitions
  const columns: ColumnDef<EmployeeListItem>[] = [
    {
      id: "employeeId",
      header: "Matricule",
      sortable: true,
      className: "w-32",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
          {row.employeeId}
        </span>
      ),
    },
    {
      id: "fullName",
      header: "Collaborateur",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
            {row.fullName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <Link
              href={`/employees/${encodeURIComponent(row.employeeId)}`}
              className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1 group"
            >
              <span className="truncate">{row.fullName}</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
            </Link>
            <p className="text-xs text-muted-foreground truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "site",
      header: "Site",
      sortable: true,
      className: "hidden md:table-cell",
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
          <span className="truncate">{row.site?.name || "Siège"}</span>
        </div>
      ),
    },
    {
      id: "position",
      header: "Poste & Département",
      sortable: true,
      className: "hidden lg:table-cell",
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-foreground truncate">
            {row.jobTitle || "Poste non défini"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {row.department || "Général"}
          </p>
        </div>
      ),
    },
    {
      id: "hireDate",
      header: "Embauche",
      sortable: true,
      className: "hidden sm:table-cell",
      cell: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {row.hireDate ? formatDate(row.hireDate) : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Statut",
      sortable: true,
      className: "w-28",
      cell: (row) => (
        <StatusBadge status={row.active ? "ACTIVE" : "INACTIVE"} size="sm" />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      className: "w-36",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/employees/${encodeURIComponent(row.employeeId)}`}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
            title="Consulter le profil complet"
            aria-label={`Profil de ${row.fullName}`}
          >
            <Eye className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Modifier le collaborateur"
            aria-label={`Modifier ${row.fullName}`}
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePromptToggleStatus(row);
            }}
            className={`p-1.5 rounded-md transition-colors ${
              row.active
                ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
            }`}
            title={row.active ? "Désactiver le collaborateur" : "Activer le collaborateur"}
            aria-label={row.active ? "Désactiver" : "Activer"}
          >
            {row.active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      {/* Messages */}
      {successMessage && (
        <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Page Header */}
      <PageHeader
        title="Répertoire des Collaborateurs"
        description="Gestion centralisée du personnel, des affectations par site et du cycle de vie des employés (Loi 65-99)."
        badge={
          <Badge variant="outline" className="text-primary border-primary/30">
            {totalEmployees} Collaborateur{totalEmployees > 1 ? "s" : ""}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1.5" />
              Exporter CSV
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nouveau Collaborateur
            </Button>
          </div>
        }
      />

      {/* Stat Cards KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Collaborateurs Actifs"
          value={activeEmployees}
          icon={<UserCheck className="h-5 w-5" />}
          description="Inscrits au registre légal du personnel"
          valueColor="primary"
        />
        <StatCard
          title="Comptes Inactifs"
          value={inactiveEmployees}
          icon={<UserX className="h-5 w-5" />}
          description="En disponibilité ou départs archivés"
          valueColor={inactiveEmployees > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Sites Opérationnels"
          value={uniqueSitesCount || sites.length}
          icon={<Building2 className="h-5 w-5" />}
          description="Implantations réparties sur le Maroc"
          valueColor="success"
        />
        <StatCard
          title="Sélection En Cours"
          value={selectedIds.length}
          icon={<Users className="h-5 w-5" />}
          description="Prêts pour actions groupées ou export"
          valueColor="default"
        />
      </div>

      {/* Filter & Search Bar */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Rechercher par matricule, nom, CIN, poste..."
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onResetFilters={handleResetAllFilters}
        totalResults={employees.length}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Site Filter */}
          <Select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="w-44 text-xs h-9"
          >
            <option value="all">Tous les sites</option>
            {sites.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as "all" | "true" | "false")}
            className="w-32 text-xs h-9"
          >
            <option value="all">Tous les statuts</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </Select>

          {/* Department Filter */}
          {departments.length > 0 && (
            <Select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-44 text-xs h-9"
            >
              <option value="all">Tous les départements</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          )}
        </div>
      </FilterBar>

      {/* DataTable */}
      <DataTable
        data={employees}
        columns={columns}
        keyExtractor={(row) => row.employeeId}
        isLoading={isLoading}
        isSelectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => router.push(`/employees/${encodeURIComponent(row.employeeId)}`)}
        batchActions={
          <div className="flex items-center gap-2">
            <Button size="xs" variant="outline" onClick={handleExportCSV}>
              Exporter la sélection ({selectedIds.length})
            </Button>
          </div>
        }
        emptyTitle="Aucun collaborateur trouvé"
        emptyDescription="Aucun employé ne correspond aux filtres sélectionnés. Essayez de réinitialiser la recherche."
        onEmptyAction={handleResetAllFilters}
        emptyActionLabel="Réinitialiser les filtres"
      />

      {/* Create & Edit Modal */}
      <EmployeeModalForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        initialData={selectedEmployee}
        onSuccess={() => {
          setSuccessMessage(
            modalMode === "create"
              ? "Nouveau collaborateur créé avec succès."
              : "Fiche collaborateur mise à jour avec succès."
          );
          reloadEmployees();
        }}
      />

      {/* Confirmation Dialog for Status Change */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleExecuteToggleStatus}
        title={
          targetEmployeeForStatus?.active
            ? "Désactiver le collaborateur ?"
            : "Réactiver le collaborateur ?"
        }
        description={
          targetEmployeeForStatus?.active
            ? `Le collaborateur ${targetEmployeeForStatus?.fullName} (${targetEmployeeForStatus?.employeeId}) ne pourra plus soumettre de demandes d'absence. Toutes ses données historiques sont préservées.`
            : `Le collaborateur ${targetEmployeeForStatus?.fullName} sera réactivé avec tous ses droits et soldes légaux.`
        }
        confirmLabel={targetEmployeeForStatus?.active ? "Désactiver" : "Activer"}
        cancelLabel="Annuler"
        variant={targetEmployeeForStatus?.active ? "destructive" : "primary"}
        isLoading={statusToggling}
      />
    </PageContainer>
  );
}
