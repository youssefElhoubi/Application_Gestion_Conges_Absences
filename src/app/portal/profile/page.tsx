"use client";

import * as React from "react";
import {
  User,
  Building2,
  Briefcase,
  Calendar,
  ShieldCheck,
  Award,
  BadgeCheck,
  Mail,
  CreditCard,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import {
  PortalHeader,
  PortalBalanceCards,
  PortalCreditsList,
} from "@/src/components/portal";
import {
  PortalApiClient,
  PortalProfileData,
} from "@/src/lib/api/portal-client";
import { formatDate } from "@/src/lib/utils";

function PortalProfileContent() {
  const [data, setData] = React.useState<PortalProfileData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const portalData = await PortalApiClient.getPortalData();
        if (isMounted) {
          setData(portalData);
          setError(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement de votre profil.";
          setError(msg);
          setIsLoading(false);
        }
      }
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6 animate-pulse">
          <div className="h-28 bg-muted/60 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-muted/30 rounded-2xl" />
            <div className="h-64 bg-muted/30 rounded-2xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !data || !data.employee) {
    return (
      <PageContainer>
        <ErrorState
          title="Profil collaborateur introuvable"
          message={error || "Votre profil n'a pas pu être chargé."}
          onRetry={() => window.location.reload()}
        />
      </PageContainer>
    );
  }

  const emp = data.employee;
  const balances = data.balances;

  return (
    <PageContainer>
      <PortalHeader data={data} />

      {/* Balances Summary */}
      <PortalBalanceCards balances={balances} />

      {/* Two Column Profile Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Personal Details Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/70 pb-3">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Informations Personnelles
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Nom et prénom :</span>
              <span className="font-semibold text-foreground text-sm">{emp.fullName}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Matricule interne :</span>
              <span className="font-mono font-bold text-primary">{emp.employeeId}</span>
            </div>

            {emp.cin && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> CIN (Carte Nationale) :
                </span>
                <span className="font-semibold text-foreground">{emp.cin}</span>
              </div>
            )}

            {emp.cnssNumber && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> N° Immatriculation CNSS :
                </span>
                <span className="font-semibold text-foreground">{emp.cnssNumber}</span>
              </div>
            )}

            {emp.birthDate && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Date de naissance :
                </span>
                <span className="font-medium text-foreground">{formatDate(emp.birthDate)}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email professionnel :
              </span>
              <span className="font-medium text-foreground">{emp.email}</span>
            </div>
          </div>
        </div>

        {/* Employment & Seniority Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/70 pb-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Contrat & Ancienneté
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Poste / Fonction :</span>
              <span className="font-semibold text-foreground text-sm">{emp.jobTitle || "Collaborateur"}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Département :</span>
              <span className="font-medium text-foreground">{emp.department || "Général"}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Site de travail :
              </span>
              <span className="font-semibold text-foreground">
                {emp.site?.name || "Casablanca"} ({emp.site?.city || "Maroc"})
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Date d&apos;embauche :
              </span>
              <span className="font-semibold text-foreground">{formatDate(emp.hireDate)}</span>
            </div>

            {balances && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" /> Ancienneté reconnue :
                </span>
                <span className="font-bold text-foreground">
                  {balances.seniorityMonths} mois ({Math.floor(balances.seniorityMonths / 12)} ans)
                </span>
              </div>
            )}

            {emp.manager && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">Responsable hiérarchique :</span>
                <span className="font-semibold text-primary">{emp.manager.fullName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recovery Credits History */}
      <div className="mb-6">
        <PortalCreditsList credits={data.unconsumedCredits} />
      </div>

      {/* Legal Entitlements Informational Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-muted/20 p-5 space-y-2.5 text-xs text-muted-foreground shadow-xs">
        <div className="font-bold text-foreground text-sm flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-primary" />
          Vos garanties statutaires selon le Code du Travail marocain (Loi 65-99)
        </div>
        <ul className="list-disc list-inside space-y-1 leading-relaxed">
          <li>
            <strong>Droit aux congés payés</strong> : 1.5 jour ouvrable par mois complet dès 6 mois de service continu (Art. 231).
          </li>
          <li>
            <strong>Exclusion des jours fériés</strong> : Les jours fériés officiels et chômés survenant durant une période de congé ne sont pas décomptés (Art. 241).
          </li>
          <li>
            <strong>Permissions exceptionnelles</strong> : Événements familiaux (Mariage : 4 jours, Naissance : 3 jours, Décès proche : 2 jours) sous réserve de justificatif légal (Art. 274).
          </li>
        </ul>
      </div>
    </PageContainer>
  );
}

export default function PortalProfilePage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 animate-pulse">
            <div className="h-28 bg-muted/60 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-muted/30 rounded-2xl" />
              <div className="h-64 bg-muted/30 rounded-2xl" />
            </div>
          </div>
        </PageContainer>
      }
    >
      <PortalProfileContent />
    </React.Suspense>
  );
}
