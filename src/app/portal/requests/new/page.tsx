"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import {
  PortalHeader,
  PortalLeaveRequestForm,
} from "@/src/components/portal";
import {
  PortalApiClient,
  PortalProfileData,
} from "@/src/lib/api/portal-client";

function NewLeaveRequestContent() {
  const router = useRouter();
  const [profileData, setProfileData] = React.useState<PortalProfileData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
            onSuccess={() => {
              router.push("/portal/requests");
            }}
            onCancel={() => {
              router.push("/portal/requests");
            }}
          />
        </div>
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
