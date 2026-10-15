"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  ArrowRight,
  ShieldCheck,
  Info,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Alert } from "@/src/components/feedback/Alert";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import {
  PortalHeader,
  PortalBalanceCards,
  PortalUpcomingLeaves,
  PortalUpcomingHolidays,
  PortalLeaveRequestForm,
  PortalRequestDetailsModal,
} from "@/src/components/portal";
import {
  PortalApiClient,
  PortalProfileData,
} from "@/src/lib/api/portal-client";
import { AbsenceListItem } from "@/src/lib/api/absence-client";
import { formatDate } from "@/src/lib/utils";

function PortalHomeContent() {
  const [data, setData] = React.useState<PortalProfileData | null>(null);
  const [recentRequests, setRecentRequests] = React.useState<AbsenceListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Modals state
  const [newRequestOpen, setNewRequestOpen] = React.useState(false);
  const [selectedAbsence, setSelectedAbsence] = React.useState<AbsenceListItem | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;

    async function loadPortal() {
      setIsLoading(true);
      try {
        const portalData = await PortalApiClient.getPortalData();
        if (isMounted) {
          setData(portalData);
          setError(null);

          // If employee exists, load recent requests
          if (portalData.employee?.employeeId) {
            const reqs = await PortalApiClient.getMyRequests(portalData.employee.employeeId, {
              pageSize: 5,
            });
            if (isMounted) {
              setRecentRequests(reqs.data);
            }
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Impossible de charger votre espace personnel.";
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPortal();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6 animate-pulse">
          <div className="h-28 bg-muted/60 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted/40 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64 bg-muted/30 rounded-2xl" />
            <div className="h-64 bg-muted/30 rounded-2xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <ErrorState
          title="Connexion à votre espace collaborateur"
          message={error || "Impossible de récupérer vos informations d'employé."}
          onRetry={triggerRefresh}
        />
      </PageContainer>
    );
  }

  if (!data.employee) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4 max-w-lg mx-auto my-12">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Info className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">Fiche collaborateur non associée</h2>
            <p className="text-xs text-muted-foreground">
              Votre compte utilisateur ({data.user.email}) est actif mais n&apos;est pas encore rattaché à un matricule collaborateur dans le système RH.
            </p>
          </div>
          <Link href="/employees">
            <Button size="sm" variant="outline">
              Aller à l&apos;annuaire RH
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Employee Welcome & Navigation */}
      <PortalHeader data={data} onOpenNewRequest={() => setNewRequestOpen(true)} />

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

      {/* Leave Balances Cards */}
      <PortalBalanceCards balances={data.balances} />

      {/* Main Split Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column (2 cols): Upcoming Leaves & Recent Requests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Leaves */}
          <PortalUpcomingLeaves
            absences={data.upcomingAbsences}
            onSelectAbsence={setSelectedAbsence}
          />

          {/* Recent Submitted Requests */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Vos dernières demandes
                </h3>
              </div>
              <Link
                href="/portal/requests"
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>Historique complet</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentRequests.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground italic">
                Vous n&apos;avez encore soumis aucune demande d&apos;absence.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentRequests.map((req) => {
                  const start = formatDate(req.startDate);
                  const end = formatDate(req.endDate);
                  const days = Number(req.retainedDays || req.calculatedWorkingDays);

                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedAbsence(req)}
                      className="group flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer gap-2 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{req.type.name}</span>
                          {req.reason && (
                            <span className="text-muted-foreground font-normal">
                              ({req.reason.name})
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {start === end ? `Le ${start}` : `Du ${start} au ${end}`} •{" "}
                          <strong>{days} j. ouvrés</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                        <StatusBadge status={req.status} size="sm" />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                          Détails →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Upcoming Holidays & Useful Resources */}
        <div className="space-y-6">
          {/* Public Holidays Widget */}
          <PortalUpcomingHolidays holidays={data.upcomingHolidays} />

          {/* Quick Support Card */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-5 space-y-3 text-xs shadow-xs">
            <div className="flex items-center gap-2 font-bold text-foreground text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Vos droits statutaires</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              En application du Code du Travail marocain (Loi 65-99), vous cumulez 1.5 jour ouvrable de congé payé par mois de service effectif dès 6 mois d&apos;ancienneté.
            </p>
            <div className="border-t border-border/70 pt-2.5 flex items-center justify-between">
              <Link
                href="/portal/profile"
                className="text-primary hover:underline font-semibold"
              >
                Consulter ma fiche et mes compteurs →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New Leave Request */}
      {newRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Nouvelle demande de congé
                </h2>
                <p className="text-xs text-muted-foreground">
                  Renseignez votre période pour obtenir le décompte légal instantané.
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
              employee={data.employee}
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

export default function PortalPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 animate-pulse">
            <div className="h-28 bg-muted/60 rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-muted/40 rounded-2xl" />
              ))}
            </div>
          </div>
        </PageContainer>
      }
    >
      <PortalHomeContent />
    </React.Suspense>
  );
}
