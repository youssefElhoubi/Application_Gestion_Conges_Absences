import { prisma } from '@/src/infrastructure/db/prisma';

export async function cleanDatabase() {
  try {
    // Delete in reverse foreign-key dependency order
    await prisma.session.deleteMany();
    await prisma.rateLimitLedger.deleteMany();
    await prisma.approvalHistory.deleteMany();
    await prisma.holidayWorkCredit.deleteMany();
    await prisma.absence.deleteMany();
    await prisma.user.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.publicHoliday.deleteMany();
    await prisma.site.deleteMany();
    await prisma.absenceReason.deleteMany();
    await prisma.absenceType.deleteMany();
    await prisma.leaveRule.deleteMany();
  } catch (err) {
    console.error('Error during test database cleanup:', err);
  }
}
