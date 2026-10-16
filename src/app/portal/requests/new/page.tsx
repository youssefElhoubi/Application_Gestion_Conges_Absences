"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { formatDate } from "@/src/lib/utils";
import {
  PortalHeader,
  PortalLeaveRequestForm,
} from "@/src/components/portal";
import {
  PortalApiClient,
  PortalProfileData,
} from "@/src/lib/api/portal-client";
import { AbsenceListItem } from "@/src/lib/api/absence-client";

function NewLeaveRequestContent() {
  const router = useRouter();
  const [profileData, setProfileData] = React.useState<PortalProfileData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submittedAbsence, setSubmittedAbsence] = React.useState<AbsenceListItem | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function loadContext() {
      try {
        const data = await PortalApiClient.getPortalData();
        if (isMounted) {
          setProfileData(data);
          setError(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement du profil.";
          setError(msg);
          setIsLoading(false);
        }
      }
    }
    loadContext();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6 animate-pulse max-w-3xl mx-auto">
          <div className="h-28 bg-muted/60 rounded-2xl" />
          <div className="h-96 bg-muted/30 rounded-2xl" />
        </div>
      </PageContainer>
    );
  }

  if (error || !profileData || !profileData.employee) {
    return (
      <PageContainer>
        <ErrorState
          title="Impossible d'accéder au formulaire"
          message={error || "Votre profil collaborateur n'a pas pu être chargé."}
          onRetry={() => window.location.reload()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PortalHeader data={profileData} />

      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <Link
            href="/portal/requests"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à mes demandes
          </Link>
        </div>

        {submittedAbsence ? (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-foreground">
                  Demande d&apos;absence #{submittedAbsence.id} transmise avec succès !
                </h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Votre demande a été enregistrée avec succès auprès du système RH.
                </p>
              </div>

              {/* Summary Card with Backend-Returned Values */}
              <div className="p-4 rounded-xl border border-border bg-card/90 max-w-md mx-auto text-left text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-muted-foreground font-medium">Statut système :</span>
                  <StatusBadge status={submittedAbsence.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type de congé :</span>
                  <span className="font-semibold text-foreground">
                    {submittedAbsence.type?.name || "Absence"}
                  </span>
                </div>
                {submittedAbsence.reason && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Motif :</span>
                    <span className="font-medium text-foreground">{submittedAbsence.reason.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Période :</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(submittedAbsence.startDate)} au {formatDate(submittedAbsence.endDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Jours ouvrés retenus :</span>
                  <span className="font-bold text-primary text-sm">
                    {Number(submittedAbsence.calculatedWorkingDays)} j.
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="text-muted-foreground">Justificatif :</span>
                  <span className="font-medium text-foreground">
                    {submittedAbsence.supportingDocumentProvided
                      ? "Justificatif fourni / déclaré"
                      : "Sans justificatif"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmittedAbsence(null)}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                >
                  Déposer une autre demande
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push("/portal/requests")}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  Consulter mes demandes
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-border/70 pb-4">
              <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Déposer une demande d&apos;absence
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Renseignez vos dates et motifs. Le moteur légal calcule automatiquement les jours ouvrés à décompter en excluant les jours fériés et repos hebdomadaires.
              </p>
            </div>

            <PortalLeaveRequestForm
              employee={profileData.employee}
              onSuccess={(created) => {
                setSubmittedAbsence(created);
              }}
              onCancel={() => {
                router.push("/portal/requests");
              }}
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function NewLeaveRequestPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 animate-pulse max-w-3xl mx-auto">
            <div className="h-28 bg-muted/60 rounded-2xl" />
            <div className="h-96 bg-muted/30 rounded-2xl" />
          </div>
        </PageContainer>
      }
    >
      <NewLeaveRequestContent />
    </React.Suspense>
  );
}
