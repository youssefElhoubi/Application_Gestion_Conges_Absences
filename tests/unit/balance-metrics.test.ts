import { describe, it, expect } from "vitest";
import {
  safeDecodeParam,
  filterAbsencesByTab,
  calculatePendingAbsenceMetrics,
  computeBalanceProgressMetrics,
} from "@/src/lib/leave-balances/balance-metrics";
import type {
  AbsenceListItem,
  EmployeeCounterItem,
  AbsenceStatus,
} from "@/src/lib/leave-balances/leave-balance.types";

function createMockAbsence(overrides: Partial<AbsenceListItem> = {}): AbsenceListItem {
  return {
    id: 1,
    employeeId: "EMP-01",
    typeId: 1,
    startDate: "2026-05-01",
    endDate: "2026-05-03",
    fraction: "FULL_DAY",
    calculatedWorkingDays: 3,
    enteredDays: 3,
    retainedDays: 3,
    supportingDocumentProvided: true,
    status: "APPROVED" as AbsenceStatus,
    requestDate: "2026-04-20",
    createdAt: "2026-04-20T10:00:00Z",
    employee: {
      employeeId: "EMP-01",
      fullName: "Test User",
      siteId: 1,
    },
    type: {
      id: 1,
      code: "CP",
      name: "Congé Payé",
      isDeductible: true,
      colorHex: "#2563eb",
    },
    ...overrides,
  };
}

describe("Unit: Leave Balance Metrics & Business Logic Utilities", () => {
  describe("safeDecodeParam", () => {
    it("safely decodes standard URI encoded parameters", () => {
      expect(safeDecodeParam("EMP%20001")).toBe("EMP 001");
      expect(safeDecodeParam("EMP-DET-01")).toBe("EMP-DET-01");
    });

    it("handles array params from Next.js route matchers", () => {
      expect(safeDecodeParam(["EMP%20002", "extra"])).toBe("EMP 002");
    });

    it("returns empty string on null, undefined, or empty string", () => {
      expect(safeDecodeParam(undefined)).toBe("");
      expect(safeDecodeParam("")).toBe("");
      expect(safeDecodeParam([])).toBe("");
    });

    it("gracefully falls back without throwing on malformed percent encoding", () => {
      // Malformed percent encoding would throw URIError with naked decodeURIComponent
      expect(safeDecodeParam("%E0%A4%A")).toBe("%E0%A4%A");
    });
  });

  describe("filterAbsencesByTab", () => {
    const sampleAbsences: AbsenceListItem[] = [
      createMockAbsence({ id: 1, status: "APPROVED" }),
      createMockAbsence({ id: 2, status: "PENDING" }),
      createMockAbsence({ id: 3, status: "REJECTED" }),
      createMockAbsence({ id: 4, status: "CANCELLED" }),
    ];

    it("returns all items when tab is 'all'", () => {
      expect(filterAbsencesByTab(sampleAbsences, "all")).toHaveLength(4);
    });

    it("filters APPROVED items when tab is 'approved'", () => {
      const result = filterAbsencesByTab(sampleAbsences, "approved");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it("filters PENDING items when tab is 'pending'", () => {
      const result = filterAbsencesByTab(sampleAbsences, "pending");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it("filters REJECTED and CANCELLED items when tab is 'other'", () => {
      const result = filterAbsencesByTab(sampleAbsences, "other");
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([3, 4]);
    });
  });

  describe("calculatePendingAbsenceMetrics", () => {
    it("correctly identifies pending absences and sums retained/working days", () => {
      const sampleAbsences: AbsenceListItem[] = [
        createMockAbsence({ id: 1, status: "PENDING", calculatedWorkingDays: 3, retainedDays: 3.5 }),
        createMockAbsence({ id: 2, status: "PENDING", calculatedWorkingDays: 2, retainedDays: 2 }),
        createMockAbsence({ id: 3, status: "APPROVED", calculatedWorkingDays: 1, retainedDays: 1 }),
      ];

      const { pendingAbsences, pendingDays } = calculatePendingAbsenceMetrics(sampleAbsences);
      expect(pendingAbsences).toHaveLength(2);
      expect(pendingDays).toBe(5.5); // 3.5 + 2.0
    });

    it("returns empty list and 0 days when no pending absences exist", () => {
      const { pendingAbsences, pendingDays } = calculatePendingAbsenceMetrics([]);
      expect(pendingAbsences).toHaveLength(0);
      expect(pendingDays).toBe(0);
    });
  });

  describe("computeBalanceProgressMetrics", () => {
    const baseCounter: EmployeeCounterItem = {
      employeeId: "EMP-01",
      fullName: "Test User",
      referenceDate: "2026-10-18",
      serviceMonths: 24,
      serviceYears: 2,
      isEligibleForAnnualLeave: true,
      statutoryAccruedDays: 18,
      activeRecoveryCreditDays: 2,
      totalApprovedDeductions: 5,
      netAvailableBalance: 15,
      calculationBreakdown: {
        monthlyRateApplied: 1.5,
        isMinorRate: false,
        seniorityMonths: 24,
        maxYearlyCapEnforced: false,
        unconsumedHolidayCreditsCount: 1,
      },
    };

    it("computes accurate percentages for standard eligible balance", () => {
      const metrics = computeBalanceProgressMetrics(baseCounter);
      expect(metrics.totalAcquiredRights).toBe(20); // 18 + 2
      expect(metrics.consumedPercent).toBe(25); // 5 / 20 = 25%
      expect(metrics.availablePercent).toBe(75); // 100 - 25%
      expect(metrics.isEligible).toBe(true);
      expect(metrics.isNegative).toBe(false);
    });

    it("handles zero total acquired rights gracefully without NaN", () => {
      const zeroCounter: EmployeeCounterItem = {
        ...baseCounter,
        statutoryAccruedDays: 0,
        activeRecoveryCreditDays: 0,
        totalApprovedDeductions: 0,
        netAvailableBalance: 0,
      };

      const metrics = computeBalanceProgressMetrics(zeroCounter);
      expect(metrics.totalAcquiredRights).toBe(0);
      expect(metrics.consumedPercent).toBe(0);
      expect(metrics.availablePercent).toBe(0);
      expect(metrics.lockedPercent).toBe(0);
    });

    it("locks available balance to 0% and assigns lockedPercent when employee is ineligible under Art. 231 (< 6 months)", () => {
      const ineligibleCounter: EmployeeCounterItem = {
        ...baseCounter,
        isEligibleForAnnualLeave: false,
        serviceMonths: 4,
        serviceYears: 0,
        statutoryAccruedDays: 6,
        activeRecoveryCreditDays: 0,
        totalApprovedDeductions: 0,
        netAvailableBalance: 0,
      };

      const metrics = computeBalanceProgressMetrics(ineligibleCounter);
      expect(metrics.totalAcquiredRights).toBe(6);
      expect(metrics.consumedPercent).toBe(0);
      expect(metrics.availablePercent).toBe(0); // Available must be 0%
      expect(metrics.lockedPercent).toBe(100); // 100% of accrued rights are locked
      expect(metrics.isEligible).toBe(false);
      expect(metrics.isNegative).toBe(false);
    });

    it("correctly identifies negative balance flag when netAvailableBalance is negative", () => {
      const negativeCounter: EmployeeCounterItem = {
        ...baseCounter,
        netAvailableBalance: -2,
        totalApprovedDeductions: 22,
      };

      const metrics = computeBalanceProgressMetrics(negativeCounter);
      expect(metrics.isNegative).toBe(true);
      expect(metrics.availablePercent).toBe(0);
    });
  });
});
