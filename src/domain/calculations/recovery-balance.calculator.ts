export interface RawCreditRecord {
  id: string | bigint;
  creditedDays: number;
  consumedDays: number;
  isFullyConsumed: boolean;
  createdAt: Date;
  publicHolidayDate?: Date;
  comment?: string | null;
}

export interface RecoveryBalanceSummary {
  totalCreditsEarned: number;
  totalCreditsConsumed: number;
  activeAvailableCredits: number;
  activeCreditsCount: number;
  neverExpires: true;
}

export interface FifoConsumptionPlanItem {
  creditId: string | bigint;
  previouslyConsumed: number;
  newlyConsumed: number;
  remainingInCredit: number;
  becomesFullyConsumed: boolean;
}

export interface FifoConsumptionPlan {
  isFeasible: boolean;
  requestedDays: number;
  totalConsumedFromCredits: number;
  unmetDays: number;
  debitSteps: FifoConsumptionPlanItem[];
}

export class RecoveryBalanceCalculator {
  /**
   * Computes recovery credits balance earned from working on public holidays.
   * Fundamental Rule: Recovery credits NEVER expire.
   */
  public static calculateBalance(credits: RawCreditRecord[]): RecoveryBalanceSummary {
    let totalCreditsEarned = 0;
    let totalCreditsConsumed = 0;
    let activeAvailableCredits = 0;
    let activeCreditsCount = 0;

    for (const credit of credits) {
      const earned = Number(credit.creditedDays);
      const consumed = Number(credit.consumedDays);
      const available = Math.max(0, earned - consumed);

      totalCreditsEarned += earned;
      totalCreditsConsumed += consumed;

      if (!credit.isFullyConsumed && available > 0) {
        activeAvailableCredits += available;
        activeCreditsCount++;
      }
    }

    return {
      totalCreditsEarned: Math.round(totalCreditsEarned * 100) / 100,
      totalCreditsConsumed: Math.round(totalCreditsConsumed * 100) / 100,
      activeAvailableCredits: Math.round(activeAvailableCredits * 100) / 100,
      activeCreditsCount,
      neverExpires: true,
    };
  }

  /**
   * Simulates chronological FIFO debit allocation against available recovery credits.
   * Oldest unconsumed credits are debited first.
   */
  public static planFifoConsumption(
    credits: RawCreditRecord[],
    daysToConsume: number
  ): FifoConsumptionPlan {
    if (daysToConsume <= 0) {
      return {
        isFeasible: true,
        requestedDays: 0,
        totalConsumedFromCredits: 0,
        unmetDays: 0,
        debitSteps: [],
      };
    }

    // Sort ascending by creation date (FIFO)
    const sorted = [...credits]
      .filter((c) => !c.isFullyConsumed && Number(c.creditedDays) > Number(c.consumedDays))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let remainingNeeded = daysToConsume;
    const steps: FifoConsumptionPlanItem[] = [];

    for (const credit of sorted) {
      if (remainingNeeded <= 0) break;

      const earned = Number(credit.creditedDays);
      const currentConsumed = Number(credit.consumedDays);
      const available = earned - currentConsumed;

      if (available <= 0) continue;

      const debitAmount = Math.min(remainingNeeded, available);
      const newTotalConsumed = currentConsumed + debitAmount;
      const isNowFullyConsumed = newTotalConsumed >= earned;

      steps.push({
        creditId: credit.id,
        previouslyConsumed: currentConsumed,
        newlyConsumed: debitAmount,
        remainingInCredit: Math.max(0, earned - newTotalConsumed),
        becomesFullyConsumed: isNowFullyConsumed,
      });

      remainingNeeded -= debitAmount;
    }

    const totalConsumedFromCredits = daysToConsume - remainingNeeded;

    return {
      isFeasible: remainingNeeded <= 0.0001,
      requestedDays: daysToConsume,
      totalConsumedFromCredits: Math.round(totalConsumedFromCredits * 100) / 100,
      unmetDays: Math.max(0, Math.round(remainingNeeded * 100) / 100),
      debitSteps: steps,
    };
  }
}
