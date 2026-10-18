"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { Badge } from "@/src/components/ui/badge";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import {
  CounterApiClient,
  EmployeeCounterItem,
} from "@/src/lib/api/counter-client";
import {
  EmployeeApiClient,
  EmployeeDetail,
} from "@/src/lib/api/employee-client";
import {
  AbsenceApiClient,
  AbsenceListItem,
} from "@/src/lib/api/absence-client";
import {
  HolidayApiClient,
  HolidayWorkCreditItem,
} from "@/src/lib/api/holiday-client";
import { toSafeNumber } from "@/src/lib/utils";
import type { AbsenceFilterTab } from "@/src/lib/leave-balances/leave-balance.types";
import {
  DEFAULT_DETAIL_ABSENCES_PAGE_SIZE,
  DEFAULT_DETAIL_CREDITS_PAGE_SIZE,
  LEGAL_STATUTORY_LABELS,
} from "@/src/lib/leave-balances/leave-balance.constants";
import {
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
  const rawId = params?.id;
  const employeeId = React.useMemo(() => {
    if (!rawId) return "";
    return Array.isArray(rawId)
      ? decodeURIComponent(rawId[0])
      : decodeURIComponent(rawId);
  }, [rawId]);

  // 1. Core State: Employee identity & Authoritative dynamic counters
  const [employee, setEmployee] = React.useState<EmployeeDetail | null>(null);
  const [counter, setCounter] = React.useState<EmployeeCounterItem | null>(null);
  const [isLoadingCore, setIsLoadingCore] = React.useState(true);
  const [coreError, setCoreError] = React.useState<string | null>(null);

  // 2. Absence History State: Independent loading and error isolation
  const [absences, setAbsences] = React.useState<AbsenceListItem[]>([]);
  const [isLoadingAbsences, setIsLoadingAbsences] = React.useState(true);
  const [absencesError, setAbsencesError] = React.useState<string | null>(null);
  const [absenceFilterTab, setAbsenceFilterTab] =
    React.useState<AbsenceFilterTab>("all");

  // 3. Recovery Credits State: Independent loading and error isolation
  const [credits, setCredits] = React.useState<HolidayWorkCreditItem[]>([]);
  const [isLoadingCredits, setIsLoadingCredits] = React.useState(true);
  const [creditsError, setCreditsError] = React.useState<string | null>(null);

  // --- Independent Data Fetchers ---

  // Fetch Core Data (Employee profile + Counter balances)
  const fetchCore = React.useCallback(() => {
    if (!employeeId) {
      Promise.resolve().then(() => {
        setCoreError("Identifiant collaborateur manquant.");
        setIsLoadingCore(false);
      });
      return;
    }

    Promise.all([
      EmployeeApiClient.getEmployee(employeeId),
      CounterApiClient.getEmployeeCounters(employeeId),
    ])
      .then(([empData, counterData]) => {
        setEmployee(empData);
        setCounter(counterData);
        setCoreError(null);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Impossible de charger les compteurs de congés du collaborateur.";
        setCoreError(msg);
      })
      .finally(() => {
        setIsLoadingCore(false);
      });
  }, [employeeId]);

  // Fetch Absence History independently
  const fetchAbsences = React.useCallback(() => {
    if (!employeeId) return;

    AbsenceApiClient.listAbsences({
      employeeId,
      pageSize: DEFAULT_DETAIL_ABSENCES_PAGE_SIZE,
    })
      .then((res) => {
        setAbsences(res.data || []);
        setAbsencesError(null);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Impossible de charger l'historique des absences.";
        setAbsencesError(msg);
      })
      .finally(() => {
        setIsLoadingAbsences(false);
      });
  }, [employeeId]);

  // Fetch Recovery Credits independently
  const fetchCredits = React.useCallback(() => {
    if (!employeeId) return;

    HolidayApiClient.listCredits({
      employeeId,
      pageSize: DEFAULT_DETAIL_CREDITS_PAGE_SIZE,
    })
      .then((res) => {
        setCredits(res.data || []);
        setCreditsError(null);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Impossible de charger les crédits de récupération.";
        setCreditsError(msg);
      })
      .finally(() => {
        setIsLoadingCredits(false);
      });
  }, [employeeId]);

  // Initial concurrent trigger
  React.useEffect(() => {
    fetchCore();
    fetchAbsences();
    fetchCredits();
  }, [fetchCore, fetchAbsences, fetchCredits]);

  // Pending requests summary for informational notice badge
  const pendingAbsences = React.useMemo(
    () => absences.filter((a) => a.status === "PENDING"),
    [absences]
  );

  const pendingDays = React.useMemo(
    () =>
      pendingAbsences.reduce((sum, a) => {
        const val = toSafeNumber(a.retainedDays ?? a.calculatedWorkingDays ?? 0);
        return sum + val;
      }, 0),
    [pendingAbsences]
  );

  // Filtered absences according to selected tab
  const filteredAbsences = React.useMemo(() => {
    if (absenceFilterTab === "approved") {
      return absences.filter((a) => a.status === "APPROVED");
    }
    if (absenceFilterTab === "pending") {
      return absences.filter((a) => a.status === "PENDING");
    }
    if (absenceFilterTab === "other") {
      return absences.filter(
        (a) => a.status === "REJECTED" || a.status === "CANCELLED"
      );
    }
    return absences;
  }, [absences, absenceFilterTab]);

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
          onRetry={() => {
            setIsLoadingCore(true);
            setCoreError(null);
            fetchCore();
          }}
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
      <BalanceCompositionBar counter={counter} />

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
            onRetry={() => {
              setIsLoadingAbsences(true);
              setAbsencesError(null);
              fetchAbsences();
            }}
            totalApprovedDeductions={counter.totalApprovedDeductions}
          />

          <RecoveryCreditsSection
            employeeId={employee.employeeId}
            credits={credits}
            isLoading={isLoadingCredits}
            error={creditsError}
            onRetry={() => {
              setIsLoadingCredits(true);
              setCreditsError(null);
              fetchCredits();
            }}
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
