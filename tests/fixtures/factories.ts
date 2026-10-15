import { prisma } from '@/src/infrastructure/db/prisma';
import { Prisma } from '@/src/generated/prisma';

export async function seedCoreTypesAndRules() {
  // 1. Absence Types
  const congePaye = await prisma.absenceType.upsert({
    where: { code: 'CONGE_PAYE' },
    update: {},
    create: {
      code: 'CONGE_PAYE',
      name: 'Congé Payé Annuel',
      isDeductible: true,
      requiresJustification: false,
      colorHex: '#3b82f6',
    },
  });

  const evenement = await prisma.absenceType.upsert({
    where: { code: 'EVENEMENT_FAMILIAL' },
    update: {},
    create: {
      code: 'EVENEMENT_FAMILIAL',
      name: 'Événement Familial',
      isDeductible: false,
      requiresJustification: true,
      colorHex: '#10b981',
    },
  });

  const recuperation = await prisma.absenceType.upsert({
    where: { code: 'RECUPERATION' },
    update: {},
    create: {
      code: 'RECUPERATION',
      name: 'Congé de Récupération',
      isDeductible: true,
      requiresJustification: false,
      colorHex: '#f59e0b',
    },
  });

  const injustifiee = await prisma.absenceType.upsert({
    where: { code: 'ABSENCE_INJUSTIFIEE' },
    update: {},
    create: {
      code: 'ABSENCE_INJUSTIFIEE',
      name: 'Absence Injustifiée',
      isDeductible: false,
      requiresJustification: false,
      colorHex: '#ef4444',
    },
  });

  // 2. Absence Reasons for Exceptional Leave
  await prisma.absenceReason.upsert({
    where: { code: 'MARIAGE_SALARIE' },
    update: { typeId: evenement.id },
    create: {
      code: 'MARIAGE_SALARIE',
      name: 'Mariage du salarié',
      allowedDays: new Prisma.Decimal(4.0),
      typeId: evenement.id,
    },
  });

  await prisma.absenceReason.upsert({
    where: { code: 'MARIAGE_ENFANT' },
    update: { typeId: evenement.id },
    create: {
      code: 'MARIAGE_ENFANT',
      name: 'Mariage d’un enfant',
      allowedDays: new Prisma.Decimal(2.0),
      typeId: evenement.id,
    },
  });

  await prisma.absenceReason.upsert({
    where: { code: 'NAISSANCE_ENFANT' },
    update: { typeId: evenement.id },
    create: {
      code: 'NAISSANCE_ENFANT',
      name: 'Naissance d’un enfant',
      allowedDays: new Prisma.Decimal(3.0),
      typeId: evenement.id,
    },
  });

  // 3. Leave Rules
  await prisma.leaveRule.upsert({
    where: { code: 'ANNUAL_ACCRUAL_RATE' },
    update: {},
    create: {
      code: 'ANNUAL_ACCRUAL_RATE',
      name: 'Taux acquisition mensuel',
      value: new Prisma.Decimal(1.5),
      unit: 'DAYS',
    },
  });

  return {
    congePaye,
    evenement,
    recuperation,
    injustifiee,
  };
}
