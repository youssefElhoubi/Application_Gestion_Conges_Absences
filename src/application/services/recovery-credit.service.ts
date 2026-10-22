import { prisma } from '@/src/infrastructure/db/prisma';
import {
  HolidayAlreadyCreditedError,
  RecoveryCreditDepletedError,
} from '@/src/domain/errors/domain-errors';
import { Prisma } from '@/src/generated/prisma';

export class RecoveryCreditService {
  /**
   * Awards recovery credit to an employee who worked on an official public holiday.
   * Business Rules:
   * - Recovery credits NEVER expire.
   * - One credit record per employee per public holiday.
   */
  public static async grantHolidayWorkCredit(
    employeeId: string,
    publicHolidayId: bigint,
    creditedDays = 1.0,
    comment?: string
  ) {
    // 1. Verify holiday exists
    const holiday = await prisma.publicHoliday.findUnique({
      where: { id: publicHolidayId },
    });
    if (!holiday) {
      throw new Error(`Public holiday with id ${publicHolidayId.toString()} does not exist.`);
    }

    // 2. Prevent duplicate credit for the same holiday
    const existing = await prisma.holidayWorkCredit.findUnique({
      where: {
        employeeId_publicHolidayId: {
          employeeId,
          publicHolidayId,
        },
      },
    });

    if (existing) {
      throw new HolidayAlreadyCreditedError(employeeId, publicHolidayId.toString());
    }

    // 3. Create credit record
    return await prisma.holidayWorkCredit.create({
      data: {
        employeeId,
        publicHolidayId,
        creditedDays: new Prisma.Decimal(creditedDays),
        consumedDays: new Prisma.Decimal(0.0),
        isFullyConsumed: false,
        comment: comment ?? `Recovery credit earned for working on ${holiday.label}`,
      },
    });
  }

  /**
   * Consumes available recovery credits in FIFO order when a recovery leave is approved.
   * Because credits never expire, all historical unconsumed records are available.
   */
  public static async consumeCredits(
    employeeId: string,
    daysToConsume: number,
    tx: Prisma.TransactionClient = prisma
  ): Promise<void> {
    if (daysToConsume <= 0) return;

    // Fetch available unconsumed credits in chronological FIFO order
    const availableCredits = await tx.holidayWorkCredit.findMany({
      where: {
        employeeId,
        isFullyConsumed: false,
      },
      orderBy: { createdAt: 'asc' },
    });

    let remainingToConsume = daysToConsume;

    for (const credit of availableCredits) {
      const credited = Number(credit.creditedDays);
      const alreadyConsumed = Number(credit.consumedDays);
      const availableInThisCredit = credited - alreadyConsumed;

      if (availableInThisCredit <= 0) continue;

      if (remainingToConsume <= availableInThisCredit) {
        // Partial or exact consumption of this credit
        const newConsumed = alreadyConsumed + remainingToConsume;
        const isFully = newConsumed >= credited;

        await tx.holidayWorkCredit.update({
          where: { id: credit.id },
          data: {
            consumedDays: new Prisma.Decimal(newConsumed),
            isFullyConsumed: isFully,
          },
        });

        remainingToConsume = 0;
        break;
      } else {
        // Exhaust this credit entirely and proceed to next
        await tx.holidayWorkCredit.update({
          where: { id: credit.id },
          data: {
            consumedDays: credit.creditedDays,
            isFullyConsumed: true,
          },
        });

        remainingToConsume -= availableInThisCredit;
      }
    }

    if (remainingToConsume > 0) {
      throw new RecoveryCreditDepletedError(
        daysToConsume - remainingToConsume,
        daysToConsume
      );
    }
  }
}
