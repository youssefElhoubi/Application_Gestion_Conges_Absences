import { describe, it, expect } from 'vitest';
import {
  RecoveryBalanceCalculator,
  RawCreditRecord,
} from '@/src/domain/calculations/recovery-balance.calculator';

describe('Unit: Recovery Credits & Recovery Balances', () => {
  it('Scenario 1: Employee with no recovery credits', () => {
    const credits: RawCreditRecord[] = [];
    const summary = RecoveryBalanceCalculator.calculateBalance(credits);

    expect(summary.totalCreditsEarned).toBe(0);
    expect(summary.totalCreditsConsumed).toBe(0);
    expect(summary.activeAvailableCredits).toBe(0);
    expect(summary.activeCreditsCount).toBe(0);
    expect(summary.neverExpires).toBe(true);
  });

  it('Scenario 2: Employee with one credit (1.0 day earned, 0 consumed)', () => {
    const credits: RawCreditRecord[] = [
      {
        id: 'cred-1',
        creditedDays: 1.0,
        consumedDays: 0.0,
        isFullyConsumed: false,
        createdAt: new Date('2026-05-01'),
        publicHolidayDate: new Date('2026-05-01'), // Fête du Travail
        comment: 'Worked Labour Day',
      },
    ];

    const summary = RecoveryBalanceCalculator.calculateBalance(credits);

    expect(summary.totalCreditsEarned).toBe(1.0);
    expect(summary.totalCreditsConsumed).toBe(0.0);
    expect(summary.activeAvailableCredits).toBe(1.0);
    expect(summary.activeCreditsCount).toBe(1);
    expect(summary.neverExpires).toBe(true);
  });

  it('Scenario 3: Employee with multiple credits across different holidays', () => {
    const credits: RawCreditRecord[] = [
      {
        id: 'cred-1',
        creditedDays: 1.0,
        consumedDays: 1.0,
        isFullyConsumed: true, // Already fully taken
        createdAt: new Date('2025-05-01'),
        publicHolidayDate: new Date('2025-05-01'),
      },
      {
        id: 'cred-2',
        creditedDays: 1.0,
        consumedDays: 0.0,
        isFullyConsumed: false,
        createdAt: new Date('2026-01-11'), // Manifeste Indépendance
        publicHolidayDate: new Date('2026-01-11'),
      },
      {
        id: 'cred-3',
        creditedDays: 1.0,
        consumedDays: 0.5,
        isFullyConsumed: false,
        createdAt: new Date('2026-05-01'),
        publicHolidayDate: new Date('2026-05-01'),
      },
    ];

    const summary = RecoveryBalanceCalculator.calculateBalance(credits);

    expect(summary.totalCreditsEarned).toBe(3.0);
    expect(summary.totalCreditsConsumed).toBe(1.5);
    expect(summary.activeAvailableCredits).toBe(1.5); // (1.0 - 0.0) + (1.0 - 0.5)
    expect(summary.activeCreditsCount).toBe(2);
    expect(summary.neverExpires).toBe(true);
  });

  it('Scenario 4: FIFO Consumption Plan allocates oldest credits first', () => {
    const credits: RawCreditRecord[] = [
      {
        id: 'cred-jan',
        creditedDays: 1.0,
        consumedDays: 0.0,
        isFullyConsumed: false,
        createdAt: new Date('2026-01-11'),
      },
      {
        id: 'cred-may',
        creditedDays: 1.0,
        consumedDays: 0.0,
        isFullyConsumed: false,
        createdAt: new Date('2026-05-01'),
      },
      {
        id: 'cred-jul',
        creditedDays: 1.0,
        consumedDays: 0.0,
        isFullyConsumed: false,
        createdAt: new Date('2026-07-30'),
      },
    ];

    // Request 1.5 days of recovery leave
    const plan = RecoveryBalanceCalculator.planFifoConsumption(credits, 1.5);

    expect(plan.isFeasible).toBe(true);
    expect(plan.requestedDays).toBe(1.5);
    expect(plan.totalConsumedFromCredits).toBe(1.5);
    expect(plan.unmetDays).toBe(0);
    expect(plan.debitSteps).toHaveLength(2);

    // Step 1: Oldest (January) is fully consumed (1.0 day)
    expect(plan.debitSteps[0].creditId).toBe('cred-jan');
    expect(plan.debitSteps[0].previouslyConsumed).toBe(0.0);
    expect(plan.debitSteps[0].newlyConsumed).toBe(1.0);
    expect(plan.debitSteps[0].remainingInCredit).toBe(0.0);
    expect(plan.debitSteps[0].becomesFullyConsumed).toBe(true);

    // Step 2: Next oldest (May) is partially consumed (0.5 day)
    expect(plan.debitSteps[1].creditId).toBe('cred-may');
    expect(plan.debitSteps[1].previouslyConsumed).toBe(0.0);
    expect(plan.debitSteps[1].newlyConsumed).toBe(0.5);
    expect(plan.debitSteps[1].remainingInCredit).toBe(0.5);
    expect(plan.debitSteps[1].becomesFullyConsumed).toBe(false);
  });

  it('Scenario 5: Infeasible request (attempting to consume more than available)', () => {
    const credits: RawCreditRecord[] = [
      {
        id: 'cred-1',
        creditedDays: 1.0,
        consumedDays: 0.0,
        isFullyConsumed: false,
        createdAt: new Date('2026-05-01'),
      },
    ];

    // Requesting 2.0 days when only 1.0 is available
    const plan = RecoveryBalanceCalculator.planFifoConsumption(credits, 2.0);

    expect(plan.isFeasible).toBe(false);
    expect(plan.requestedDays).toBe(2.0);
    expect(plan.totalConsumedFromCredits).toBe(1.0);
    expect(plan.unmetDays).toBe(1.0);
    expect(plan.debitSteps).toHaveLength(1);
    expect(plan.debitSteps[0].creditId).toBe('cred-1');
    expect(plan.debitSteps[0].newlyConsumed).toBe(1.0);
    expect(plan.debitSteps[0].becomesFullyConsumed).toBe(true);
  });

  it('Scenario 6: Partial-day recovery leave (0.5 day debit)', () => {
    const credits: RawCreditRecord[] = [
      {
        id: 'cred-1',
        creditedDays: 1.0,
        consumedDays: 0.0,
        isFullyConsumed: false,
        createdAt: new Date('2026-01-11'),
      },
    ];

    const plan = RecoveryBalanceCalculator.planFifoConsumption(credits, 0.5);

    expect(plan.isFeasible).toBe(true);
    expect(plan.requestedDays).toBe(0.5);
    expect(plan.totalConsumedFromCredits).toBe(0.5);
    expect(plan.debitSteps[0].remainingInCredit).toBe(0.5);
    expect(plan.debitSteps[0].becomesFullyConsumed).toBe(false);
  });

  it('Scenario 7: Zero days requested produces empty valid plan', () => {
    const credits: RawCreditRecord[] = [
      {
        id: 'cred-1',
        creditedDays: 1.0,
        consumedDays: 0.0,
        isFullyConsumed: false,
        createdAt: new Date('2026-01-11'),
      },
    ];

    const plan = RecoveryBalanceCalculator.planFifoConsumption(credits, 0);

    expect(plan.isFeasible).toBe(true);
    expect(plan.requestedDays).toBe(0);
    expect(plan.totalConsumedFromCredits).toBe(0);
    expect(plan.debitSteps).toHaveLength(0);
  });

  it('Scenario 8: Non-expiring statutory rule verification', () => {
    // Credits from 5 years ago remain valid and available
    const ancientCredit: RawCreditRecord = {
      id: 'cred-ancient',
      creditedDays: 2.0,
      consumedDays: 0.0,
      isFullyConsumed: false,
      createdAt: new Date('2021-05-01'),
      publicHolidayDate: new Date('2021-05-01'),
    };

    const summary = RecoveryBalanceCalculator.calculateBalance([ancientCredit]);
    expect(summary.activeAvailableCredits).toBe(2.0);
    expect(summary.neverExpires).toBe(true);
  });
});
