import { describe, it, expect, vi, beforeEach } from "vitest";
import { LeaveBalanceService } from "@/src/lib/leave-balances/leave-balance.service";
import { EmployeeApiClient, type EmployeeDetail } from "@/src/lib/api/employee-client";
import { CounterApiClient, type EmployeeCounterItem } from "@/src/lib/api/counter-client";
import {
  AbsenceApiClient,
  type AbsenceListItem,
  type PaginatedAbsencesResponse,
} from "@/src/lib/api/absence-client";
import {
  HolidayApiClient,
  type HolidayWorkCreditItem,
  type PaginatedResult,
} from "@/src/lib/api/holiday-client";

describe("Unit: LeaveBalanceService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCoreLeaveBalanceData", () => {
    it("fetches employee profile and dynamic counters concurrently", async () => {
      const mockEmployee = {
        employeeId: "EMP-100",
        firstName: "Karim",
        lastName: "Bennani",
        fullName: "Karim Bennani",
        siteId: 1,
        active: true,
      } as unknown as EmployeeDetail;

      const mockCounter = {
        employeeId: "EMP-100",
        fullName: "Karim Bennani",
        statutoryAccruedDays: 24,
        totalApprovedDeductions: 6,
        netAvailableBalance: 18,
        activeRecoveryCreditDays: 0,
        isEligibleForAnnualLeave: true,
      } as unknown as EmployeeCounterItem;

      const getEmployeeSpy = vi
        .spyOn(EmployeeApiClient, "getEmployee")
        .mockResolvedValue(mockEmployee);
      const getCountersSpy = vi
        .spyOn(CounterApiClient, "getEmployeeCounters")
        .mockResolvedValue(mockCounter);

      const result = await LeaveBalanceService.getCoreLeaveBalanceData("EMP-100");

      expect(getEmployeeSpy).toHaveBeenCalledWith("EMP-100");
      expect(getCountersSpy).toHaveBeenCalledWith("EMP-100");
      expect(result).toEqual({
        employee: mockEmployee,
        counter: mockCounter,
      });
    });

    it("propagates error if employee fetching fails", async () => {
      vi.spyOn(EmployeeApiClient, "getEmployee").mockRejectedValue(
        new Error("Collaborateur introuvable")
      );
      vi.spyOn(CounterApiClient, "getEmployeeCounters").mockResolvedValue(
        {} as unknown as EmployeeCounterItem
      );

      await expect(
        LeaveBalanceService.getCoreLeaveBalanceData("EMP-999")
      ).rejects.toThrow("Collaborateur introuvable");
    });
  });

  describe("getAbsenceHistory", () => {
    it("fetches absences and returns data array", async () => {
      const mockAbsences = [
        { id: 1, employeeId: "EMP-100", status: "APPROVED" },
        { id: 2, employeeId: "EMP-100", status: "PENDING" },
      ] as unknown as AbsenceListItem[];

      const listAbsencesSpy = vi
        .spyOn(AbsenceApiClient, "listAbsences")
        .mockResolvedValue({
          data: mockAbsences,
          meta: {
            totalItems: 2,
            itemCount: 2,
            itemsPerPage: 50,
            totalPages: 1,
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });

      const result = await LeaveBalanceService.getAbsenceHistory("EMP-100", 50);

      expect(listAbsencesSpy).toHaveBeenCalledWith({
        employeeId: "EMP-100",
        pageSize: 50,
      });
      expect(result).toEqual(mockAbsences);
    });

    it("defaults to empty array if response data is missing", async () => {
      vi.spyOn(AbsenceApiClient, "listAbsences").mockResolvedValue({} as PaginatedAbsencesResponse);

      const result = await LeaveBalanceService.getAbsenceHistory("EMP-100");
      expect(result).toEqual([]);
    });
  });

  describe("getHolidayWorkCredits", () => {
    it("fetches holiday recovery credits and returns data array", async () => {
      const mockCredits = [
        { id: 10, employeeId: "EMP-100", daysCredited: 1, isConsumed: false },
      ] as unknown as HolidayWorkCreditItem[];

      const listCreditsSpy = vi
        .spyOn(HolidayApiClient, "listCredits")
        .mockResolvedValue({
          data: mockCredits,
          meta: {
            totalItems: 1,
            pageSize: 50,
            totalPages: 1,
            page: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });

      const result = await LeaveBalanceService.getHolidayWorkCredits("EMP-100", 50);

      expect(listCreditsSpy).toHaveBeenCalledWith({
        employeeId: "EMP-100",
        pageSize: 50,
      });
      expect(result).toEqual(mockCredits);
    });

    it("defaults to empty array if response data is missing", async () => {
      vi.spyOn(HolidayApiClient, "listCredits").mockResolvedValue(
        {} as PaginatedResult<HolidayWorkCreditItem>
      );

      const result = await LeaveBalanceService.getHolidayWorkCredits("EMP-100");
      expect(result).toEqual([]);
    });
  });

  describe("listCounters", () => {
    it("delegates query parameters to CounterApiClient.listCounters", async () => {
      const mockResponse = {
        data: [],
        meta: { totalItems: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1, hasNextPage: false },
      };

      const listSpy = vi.spyOn(CounterApiClient, "listCounters").mockResolvedValue(mockResponse);

      const query = { page: 1, pageSize: 10, search: "Youssef" };
      const result = await LeaveBalanceService.listCounters(query);

      expect(listSpy).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("listSites", () => {
    it("delegates to EmployeeApiClient.listSites", async () => {
      const mockSites = [
        { id: 1, name: "Siège", code: "SIEGE", city: "Casablanca", active: true },
      ];
      const listSpy = vi.spyOn(EmployeeApiClient, "listSites").mockResolvedValue(mockSites);

      const result = await LeaveBalanceService.listSites();

      expect(listSpy).toHaveBeenCalled();
      expect(result).toEqual(mockSites);
    });
  });
});

