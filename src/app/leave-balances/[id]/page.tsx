"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { Badge } from "@/src/components/ui/badge";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import { LEGAL_STATUTORY_LABELS } from "@/src/lib/leave-balances/leave-balance.constants";
import { safeDecodeParam } from "@/src/lib/leave-balances/balance-metrics";
import {
  useLeaveBalanceDetail,
  LeaveBalanceDetailSkeleton,
  EmployeeHeaderBanner,
  StatutoryAlerts,
  LeaveBalanceKpiGrid,
  BalanceCompositionBar,
  PendingAbsencesNotice,
  StatutoryEntitlementCard,
  BalanceQuickActionsCard,
  AbsenceHistorySection,
  RecoveryCreditsSection,
} from "@/src/components/leave-balances";

function LeaveBalanceDetailContent() {
  const params = useParams();
  const router = useRouter();

  // Safely extract employee identifier from URL parameter
  const employeeId = React.useMemo(
    () => safeDecodeParam(params?.id),
    [params?.id]
  );

  const {
    employee,
    counter,
    isLoadingCore,
    coreError,
    retryCore,
    absences,
    filteredAbsences,
    absenceFilterTab,
    setAbsenceFilterTab,
    isLoadingAbsences,
    absencesError,
    retryAbsences,
    credits,
    isLoadingCredits,
    creditsError,
    retryCredits,
    pendingAbsences,
    pendingDays,
    progressMetrics,
  } = useLeaveBalanceDetail(employeeId);

  // 1. Core Loading View
  if (isLoadingCore) {
    return <LeaveBalanceDetailSkeleton />;
  }

  // 2. Core Error View (renders only if employee or counters cannot be retrieved)
  if (coreError || !employee || !counter) {
    return (
      <PageContainer>
        <ErrorState
          title="Fiche solde collaborateur introuvable"
          message={
            coreError ||
            `Aucune donnée de solde disponible pour le matricule « ${employeeId} ».`
          }
          onRetry={retryCore}
          secondaryActionLabel="Retour aux soldes de congés"
          onSecondaryAction={() => router.push("/leave-balances")}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 1. Page Header & Back Navigation */}
      <PageHeader
        title="Détail des Soldes et Compteurs"
        description="Situation statutaire, acquisition annuelle et historique des congés selon le Code du Travail marocain (Loi 65-99)."
        breadcrumbs={
          <Link
            href="/leave-balances"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour aux soldes de congés</span>
          </Link>
        }
        badge={
          <Badge
            variant="outline"
            className="text-xs bg-primary/10 text-primary border-primary/20 flex items-center gap-1 font-semibold"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {LEGAL_STATUTORY_LABELS.CODE_DU_TRAVAIL_BADGE}
          </Badge>
        }
      />

      {/* 2. Employee Header Banner */}
      <EmployeeHeaderBanner employee={employee} />

      {/* 3. Statutory Alerts */}
      <StatutoryAlerts counter={counter} />

      {/* 4. Balance Summary KPI Cards */}
      <LeaveBalanceKpiGrid counter={counter} />

      {/* 5. Balance Composition Bar */}
      <BalanceCompositionBar
        counter={counter}
        metrics={progressMetrics ?? undefined}
      />

      {/* 6. Pending Absences Notice */}
      <PendingAbsencesNotice
        employeeId={employee.employeeId}
        pendingAbsencesCount={pendingAbsences.length}
        pendingDays={pendingDays}
        netAvailableBalance={counter.netAvailableBalance}
      />

      {/* 7. Main Body Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Statutory Entitlement & Navigation */}
        <div className="lg:col-span-1 space-y-6">
          <StatutoryEntitlementCard counter={counter} />
          <BalanceQuickActionsCard employeeId={employee.employeeId} />
        </div>

        {/* Right Column: Absence History & Recovery Credits */}
        <div className="lg:col-span-2 space-y-6">
          <AbsenceHistorySection
            employeeId={employee.employeeId}
            absences={absences}
            filteredAbsences={filteredAbsences}
            activeTab={absenceFilterTab}
            onTabChange={setAbsenceFilterTab}
            isLoading={isLoadingAbsences}
            error={absencesError}
            onRetry={retryAbsences}
            totalApprovedDeductions={counter.totalApprovedDeductions}
          />

          <RecoveryCreditsSection
            employeeId={employee.employeeId}
            credits={credits}
            isLoading={isLoadingCredits}
            error={creditsError}
            onRetry={retryCredits}
            activeRecoveryCreditDays={counter.activeRecoveryCreditDays}
          />
        </div>
      </div>
    </PageContainer>
  );
}

export default function LeaveBalanceDetailPage() {
  return (
    <React.Suspense fallback={<LeaveBalanceDetailSkeleton />}>
      <LeaveBalanceDetailContent />
    </React.Suspense>
  );
}
