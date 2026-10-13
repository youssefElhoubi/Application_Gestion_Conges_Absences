import { prisma } from '@/src/infrastructure/db/prisma';
import { Fraction } from '@/src/generated/prisma';
import { WorkingDaysCalculator } from '@/src/domain/calculations/working-days.calculator';
import { WorkingDaysResult } from '@/src/domain/types/business-logic.types';

export class WorkingDaysService {
  /**
   * Calculates deductible working days by loading site-specific rest days
   * and all public holidays falling within the period.
   * Public holidays NEVER consume annual leave.
   */
  public static async calculateWorkingDays(
    startDate: Date,
    endDate: Date,
    fraction: Fraction,
    siteId: number
  ): Promise<WorkingDaysResult> {
    const [site, publicHolidays] = await Promise.all([
      prisma.site.findUnique({
        where: { id: siteId },
        select: { weeklyRestDays: true },
      }),
      prisma.publicHoliday.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { date: true },
      }),
    ]);

    const weeklyRestDays = site?.weeklyRestDays ?? [0];
    const holidayDates = publicHolidays.map((h: { date: Date }) => h.date);

    return WorkingDaysCalculator.calculate({
      startDate,
      endDate,
      fraction,
      weeklyRestDays,
      publicHolidays: holidayDates,
    });
  }
}
