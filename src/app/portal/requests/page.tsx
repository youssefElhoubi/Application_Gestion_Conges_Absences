"use client";

import * as React from "react";
import {
  CalendarDays,
  PlusCircle,
  FileCheck2,
  Eye,
  RotateCcw,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Alert } from "@/src/components/feedback/Alert";
import {
  PortalHeader,
  PortalLeaveRequestForm,
  PortalRequestDetailsModal,
} from "@/src/components/portal";
import {
  PortalApiClient,
  PortalProfileData,
} from "@/src/lib/api/portal-client";
import { AbsenceListItem, AbsenceTypeItem } from "@/src/lib/api/absence-client";
import { formatDate } from "@/src/lib/utils";

function MyRequestsContent() {
  const [profileData, setProfileData] = React.useState<PortalProfileData | null>(null);
  const [requests, setRequests] = React.useState<AbsenceListItem[]>([]);
  const [types, setTypes] = React.useState<AbsenceTypeItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;
  const [totalItems, setTotalItems] = React.useState(0);

  // Filter state
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [yearFilter, setYearFilter] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modals state
  const [newRequestOpen, setNewRequestOpen] = React.useState(false);
  const [selectedAbsence, setSelectedAbsence] = React.useState<AbsenceListItem | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Load profile context and types
  React.useEffect(() => {
    Promise.all([
      PortalApiClient.getPortalData().catch(() => null),
      PortalApiClient.getAbsenceTypes().catch(() => []),
    ]).then(([portalData, typesList]) => {
      setProfileData(portalData);
      setTypes(typesList);
    });
  }, []);

  // Fetch requests when filters or employeeId changes
  React.useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      if (!profileData?.employee?.employeeId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await PortalApiClient.getMyRequests(profileData.employee.employeeId, {
          page: currentPage,
          pageSize,
          status: statusFilter,
          typeId: typeFilter,
          year: yearFilter,
          search: searchQuery,
        });

        if (isMounted) {
          setRequests(res.data);
          setTotalItems(res.meta.totalItems);
          setError(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement de vos demandes.";
          setError(msg);
          setIsLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, [profileData?.employee?.employeeId, currentPage, pageSize, statusFilter, typeFilter, yearFilter, searchQuery, refreshKey]);

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleResetFilters = () => {
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setYearFilter("ALL");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "ALL" || typeFilter !== "ALL" || yearFilter !== "ALL" || Boolean(searchQuery);

  return (
    <PageContainer>
      {/* Header and tabs */}
      <PortalHeader data={profileData} onOpenNewRequest={() => setNewRequestOpen(true)} />

      {/* Global Alerts */}
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

      {error && (
        <Alert
          variant="destructive"
          title="Erreur"
          className="mb-4"
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Section Title & Filter Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 mb-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Mes Demandes de Congé & Historique
            </h2>
            <p className="text-xs text-muted-foreground">
              Suivez l&apos;état d&apos;avancement de vos demandes et consultez vos congés passés.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setNewRequestOpen(true)}
            leftIcon={<PlusCircle className="h-4 w-4" />}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold self-start sm:self-auto"
          >
            Nouveau congé
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/60 text-xs">
          {/* Status filter */}
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
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

          {/* Type filter */}
          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-[150px] text-xs h-9"
          >
            <option value="ALL">Tous les types</option>
            {types.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </Select>

          {/* Year filter */}
          <Select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-[110px] text-xs h-9"
          >
            <option value="ALL">Toutes années</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </Select>

          {/* Search input */}
          <input
            type="text"
            placeholder="Filtrer par motif..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-48"
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              className="text-xs text-muted-foreground hover:text-foreground h-9"
            >
              Réinitialiser
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground font-medium">
            {totalItems} demande{totalItems > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Requests Listing */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-2xl border border-border" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {hasActiveFilters ? "Aucune demande ne correspond à vos filtres" : "Aucune demande d'absence"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {hasActiveFilters
                ? "Essayez de réinitialiser vos critères de recherche pour afficher toutes vos demandes."
                : "Vous n'avez pas encore posé de congés ou d'absence dans l'application."}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button size="sm" variant="outline" onClick={handleResetFilters} className="text-xs">
              Réinitialiser les filtres
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setNewRequestOpen(true)}
              leftIcon={<PlusCircle className="h-4 w-4" />}
              className="text-xs"
            >
              Déposer ma première demande
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const start = formatDate(req.startDate);
            const end = formatDate(req.endDate);
            const days = Number(req.retainedDays || req.calculatedWorkingDays);
            const isSingleDay = start === end;

            return (
              <div
                key={req.id}
                onClick={() => setSelectedAbsence(req)}
                className="group flex flex-col md:flex-row md:items-center md:justify-between p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-all cursor-pointer shadow-xs gap-3"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className="w-3 h-12 rounded-full shrink-0 mt-0.5 sm:mt-0"
                    style={{ backgroundColor: req.type.colorHex || "#3b82f6" }}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                        {req.type.name}
                      </span>
                      {req.reason && (
                        <span className="text-xs font-medium text-muted-foreground">
                          • {req.reason.name}
                        </span>
                      )}
                      <StatusBadge status={req.status} size="sm" />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{isSingleDay ? `Le ${start}` : `Du ${start} au ${end}`}</span>
                      <span>•</span>
                      <span>{req.fraction === "FULL_DAY" ? "Journée entière" : "Demi-journée"}</span>
                      {req.supportingDocumentProvided && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <FileCheck2 className="h-3.5 w-3.5" /> Justificatif
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-border/50">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-foreground">
                      {days} {days > 1 ? "jours ouvrés" : "jour ouvré"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Demandé le {formatDate(req.requestDate)}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground group-hover:text-primary h-8 px-2"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Détails
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {totalItems > pageSize && (
        <div className="flex items-center justify-between pt-6 border-t border-border mt-6 text-xs text-muted-foreground">
          <span>
            Page {currentPage} sur {Math.ceil(totalItems / pageSize)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-xs h-8"
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= Math.ceil(totalItems / pageSize)}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="text-xs h-8"
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Modal: New Leave Request */}
      {newRequestOpen && profileData?.employee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Nouvelle demande de congé
                </h2>
                <p className="text-xs text-muted-foreground">
                  Soumettez votre demande pour arbitrage de votre responsable.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewRequestOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 text-sm rounded-md"
              >
                ✕
              </button>
            </div>

            <PortalLeaveRequestForm
              employee={profileData.employee}
              onSuccess={() => {
                setNewRequestOpen(false);
                setSuccessMessage("Votre demande d'absence a été transmise avec succès.");
                triggerRefresh();
              }}
              onCancel={() => setNewRequestOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modal: Request Details */}
      <PortalRequestDetailsModal
        isOpen={Boolean(selectedAbsence)}
        onClose={() => setSelectedAbsence(null)}
        absence={selectedAbsence}
        onCancelSuccess={() => {
          setSuccessMessage("La demande a été annulée avec succès.");
          triggerRefresh();
        }}
      />
    </PageContainer>
  );
}

export default function MyRequestsPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 animate-pulse">
            <div className="h-28 bg-muted/60 rounded-2xl" />
            <div className="h-48 bg-muted/30 rounded-2xl" />
          </div>
        </PageContainer>
      }
    >
      <MyRequestsContent />
    </React.Suspense>
  );
}
