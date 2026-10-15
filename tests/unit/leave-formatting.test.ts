import { describe, it, expect } from "vitest";
import { formatLeaveDays, toSafeNumber, formatDays } from "@/src/lib/utils";

describe("Unit: Leave Days & Decimal Formatting Utilities", () => {
  describe("toSafeNumber", () => {
    it("handles native JavaScript numbers", () => {
      expect(toSafeNumber(0)).toBe(0);
      expect(toSafeNumber(14)).toBe(14);
      expect(toSafeNumber(1.5)).toBe(1.5);
      expect(toSafeNumber(-3)).toBe(-3);
      expect(toSafeNumber(NaN)).toBe(0);
    });

    it("handles numeric strings safely", () => {
      expect(toSafeNumber("0")).toBe(0);
      expect(toSafeNumber("24.5")).toBe(24.5);
      expect(toSafeNumber("-2.0")).toBe(-2);
      expect(toSafeNumber("invalid")).toBe(0);
    });

    it("handles null and undefined fallbacks", () => {
      expect(toSafeNumber(null)).toBe(0);
      expect(toSafeNumber(undefined)).toBe(0);
    });

    it("handles Prisma Decimal-like objects with toNumber() or toString()", () => {
      const decimalWithToNumber = {
        toNumber: () => 18.5,
        toString: () => "18.5",
      };
      expect(toSafeNumber(decimalWithToNumber)).toBe(18.5);

      const decimalWithToStringOnly = {
        toString: () => "7.25",
      };
      expect(toSafeNumber(decimalWithToStringOnly)).toBe(7.25);
    });
  });

  describe("formatLeaveDays (French Grammatical Rules & Decimals)", () => {
    it("formats zero with correct singular wording", () => {
      expect(formatLeaveDays(0, { mode: "full" })).toBe("0 jour");
      expect(formatLeaveDays(0, { mode: "short" })).toBe("0 j");
      expect(formatLeaveDays(0)).toBe("0 j");
    });

    it("formats 1 day with singular wording", () => {
      expect(formatLeaveDays(1, { mode: "full" })).toBe("1 jour");
      expect(formatLeaveDays(1, { mode: "short" })).toBe("1 j");
    });

    it("formats fractional values strictly less than 2 with singular 'jour'", () => {
      // In French grammar, numbers strictly < 2 take singular 'jour'
      expect(formatLeaveDays(0.5, { mode: "full" })).toBe("0,5 jour");
      expect(formatLeaveDays(1.5, { mode: "full" })).toBe("1,5 jour");
      expect(formatLeaveDays(0.5, { mode: "short" })).toBe("0,5 j");
      expect(formatLeaveDays(1.5, { mode: "short" })).toBe("1,5 j");
    });

    it("formats quantities >= 2 with plural 'jours'", () => {
      expect(formatLeaveDays(2, { mode: "full" })).toBe("2 jours");
      expect(formatLeaveDays(2.5, { mode: "full" })).toBe("2,5 jours");
      expect(formatLeaveDays(18, { mode: "full" })).toBe("18 jours");
      expect(formatLeaveDays(22.5, { mode: "full" })).toBe("22,5 jours");
      expect(formatLeaveDays(22.5, { mode: "short" })).toBe("22,5 j");
    });

    it("handles Prisma Decimal instances cleanly in full mode", () => {
      const mockPrismaDecimal = {
        toNumber: () => 4.0,
        toString: () => "4.0",
      };
      expect(formatLeaveDays(mockPrismaDecimal, { mode: "full" })).toBe("4 jours");
    });

    it("handles null and undefined without crashing", () => {
      expect(formatLeaveDays(null, { mode: "full" })).toBe("0 jour");
      expect(formatLeaveDays(undefined, { mode: "short" })).toBe("0 j");
    });

    it("supports optional sign prefix", () => {
      expect(formatLeaveDays(1.5, { showSign: true })).toBe("+1,5 j");
      expect(formatLeaveDays(0, { showSign: true })).toBe("0 j");
    });

    it("preserves backward compatibility with formatDays helper", () => {
      expect(formatDays(14)).toBe("14 j");
      expect(formatDays(1.5)).toBe("1,5 j");
      expect(formatDays(null)).toBe("0 j");
    });
  });
});
