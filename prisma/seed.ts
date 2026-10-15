import { prisma } from '../src/infrastructure/db/prisma';
import { seedCoreTypesAndRules } from '../tests/fixtures/factories';

export async function seedDatabase() {
  console.log('Seeding core types and rules...');
  const types = await seedCoreTypesAndRules();

  console.log('Seeding sites...');
  const siteCasa = await prisma.site.upsert({
    where: { code: 'CASABLANCA' },
    update: {},
    create: {
      code: 'CASABLANCA',
      name: 'Siège Social Casablanca',
      city: 'Casablanca',
      timezone: 'Africa/Casablanca',
      weeklyRestDays: [0], // Dimanche
      active: true,
    },
  });

  const siteTanger = await prisma.site.upsert({
    where: { code: 'TANGER' },
    update: {},
    create: {
      code: 'TANGER',
      name: 'Usine Tanger Automotive',
      city: 'Tanger',
      timezone: 'Africa/Casablanca',
      weeklyRestDays: [0, 6], // Samedi et Dimanche
      active: true,
    },
  });

  const siteRabat = await prisma.site.upsert({
    where: { code: 'RABAT' },
    update: {},
    create: {
      code: 'RABAT',
      name: 'Hub Technologique Rabat Technopolis',
      city: 'Rabat',
      timezone: 'Africa/Casablanca',
      weeklyRestDays: [0],
      active: true,
    },
  });

  console.log('Seeding HR Administrator and employees...');

  // 1. HR Manager / Admin
  const adminEmp = await prisma.employee.upsert({
    where: { employeeId: 'MAT-0042' },
    update: {},
    create: {
      employeeId: 'MAT-0042',
      cin: 'BE123456',
      cnssNumber: '109823412',
      fullName: 'Karim Bennani',
      email: 'admin@entreprise.ma',
      siteId: siteCasa.id,
      jobTitle: 'Directeur des Ressources Humaines',
      department: 'Ressources Humaines',
      hireDate: new Date('2019-03-01'),
      birthDate: new Date('1984-06-15'),
      active: true,
      observation: 'Responsable de la conformité légale et gestion sociale (Loi 65-99).',
    },
  });

  // Admin user
  await prisma.user.upsert({
    where: { id: 'usr-admin-default' },
    update: {},
    create: {
      id: 'usr-admin-default',
      email: 'admin@entreprise.ma',
      passwordHash: 'argon2_mock_hash',
      role: 'ADMIN',
      isActive: true,
      employeeId: adminEmp.employeeId,
    },
  });

  // 2. Sample Employees
  const employeeData = [
    {
      employeeId: 'EMP-0101',
      cin: 'BK654321',
      cnssNumber: '201934812',
      fullName: 'Fatima-Zahra Alami',
      email: 'fz.alami@entreprise.ma',
      siteId: siteCasa.id,
      jobTitle: 'Lead Software Architect',
      department: 'Ingénierie & Tech',
      hireDate: new Date('2021-04-10'),
      birthDate: new Date('1990-11-20'),
      managerId: 'MAT-0042',
      active: true,
      observation: 'Référente technique sur les systèmes distribués.',
    },
    {
      employeeId: 'EMP-0102',
      cin: 'BJ876543',
      cnssNumber: '304859123',
      fullName: 'Yassine Tazi',
      email: 'y.tazi@entreprise.ma',
      siteId: siteCasa.id,
      jobTitle: 'Senior Frontend Engineer',
      department: 'Ingénierie & Tech',
      hireDate: new Date('2022-09-01'),
      birthDate: new Date('1993-04-05'),
      managerId: 'EMP-0101',
      active: true,
      observation: 'Spécialiste UI/UX et Design Systems React.',
    },
    {
      employeeId: 'EMP-0103',
      cin: 'KB445566',
      cnssNumber: '401928374',
      fullName: 'Sara El Amrani',
      email: 's.amrani@entreprise.ma',
      siteId: siteRabat.id,
      jobTitle: 'Responsable Contrôle de Gestion',
      department: 'Finance & Comptabilité',
      hireDate: new Date('2020-01-15'),
      birthDate: new Date('1988-08-12'),
      managerId: 'MAT-0042',
      active: true,
      observation: 'Supervision budgétaire et clôtures mensuelles.',
    },
    {
      employeeId: 'EMP-0104',
      cin: 'L998877',
      cnssNumber: '501239845',
      fullName: 'Mehdi Benjelloun',
      email: 'm.benjelloun@entreprise.ma',
      siteId: siteTanger.id,
      jobTitle: 'Superviseur de Production',
      department: 'Logistique & Opérations',
      hireDate: new Date('2018-06-01'),
      birthDate: new Date('1985-02-28'),
      managerId: 'MAT-0042',
      active: true,
      observation: 'Responsable de la ligne d assemblage 2.',
    },
    {
      employeeId: 'EMP-0105',
      cin: 'CD332211',
      cnssNumber: '601948372',
      fullName: 'Nadia Chraibi',
      email: 'n.chraibi@entreprise.ma',
      siteId: siteCasa.id,
      jobTitle: 'Responsable Paie & Administration RH',
      department: 'Ressources Humaines',
      hireDate: new Date('2023-02-01'),
      birthDate: new Date('1995-09-17'),
      managerId: 'MAT-0042',
      active: true,
      observation: 'Gestion des déclarations CNSS et registres des congés.',
    },
    {
      employeeId: 'EMP-0106',
      cin: 'AE554433',
      cnssNumber: '702819384',
      fullName: 'Omar Kabbaj',
      email: 'o.kabbaj@entreprise.ma',
      siteId: siteTanger.id,
      jobTitle: 'Technicien Maintenance Industrielle',
      department: 'Logistique & Opérations',
      hireDate: new Date('2024-05-15'),
      birthDate: new Date('1998-03-22'),
      managerId: 'EMP-0104',
      active: true,
      observation: 'Maintenance préventive des machines automatisées.',
    },
    {
      employeeId: 'EMP-0107',
      cin: 'HH112233',
      cnssNumber: '801293847',
      fullName: 'Houda Berrada',
      email: 'h.berrada@entreprise.ma',
      siteId: siteRabat.id,
      jobTitle: 'Product Manager',
      department: 'Ingénierie & Tech',
      hireDate: new Date('2021-11-01'),
      birthDate: new Date('1991-12-04'),
      managerId: 'MAT-0042',
      active: true,
      observation: 'Pilotage de la roadmap produit applicative.',
    },
    {
      employeeId: 'EMP-0108',
      cin: 'Z778899',
      cnssNumber: '901827364',
      fullName: 'Reda Mansouri',
      email: 'r.mansouri@entreprise.ma',
      siteId: siteCasa.id,
      jobTitle: 'Chargé de Recrutement & Onboarding',
      department: 'Ressources Humaines',
      hireDate: new Date('2024-08-01'),
      birthDate: new Date('1999-07-30'),
      managerId: 'MAT-0042',
      active: true,
      observation: 'Nouveau collaborateur en période d essai probatoire.',
    },
    {
      employeeId: 'EMP-0109',
      cin: 'M665544',
      cnssNumber: '102938475',
      fullName: 'Amina Tahiri',
      email: 'a.tahiri@entreprise.ma',
      siteId: siteCasa.id,
      jobTitle: 'Key Account Executive',
      department: 'Commercial & Ventes',
      hireDate: new Date('2020-07-15'),
      birthDate: new Date('1987-10-10'),
      managerId: 'MAT-0042',
      active: false,
      observation: 'Compte inactif - En disponibilité professionnelle.',
    },
    {
      employeeId: 'EMP-0110',
      cin: 'FA990011',
      cnssNumber: '209384756',
      fullName: 'Hamza Fassi',
      email: 'h.fassi@entreprise.ma',
      siteId: siteTanger.id,
      jobTitle: 'Opérateur Qualité & Normes ISO',
      department: 'Logistique & Opérations',
      hireDate: new Date('2019-10-01'),
      birthDate: new Date('1986-05-19'),
      managerId: 'EMP-0104',
      active: false,
      observation: 'Départ de l entreprise en mai 2026.',
    },
  ];

  for (const emp of employeeData) {
    await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: {},
      create: emp,
    });
  }

  // Employee user for portal testing
  await prisma.user.upsert({
    where: { id: 'usr-emp-alami' },
    update: {},
    create: {
      id: 'usr-emp-alami',
      email: 'fz.alami@entreprise.ma',
      passwordHash: 'argon2_mock_hash',
      role: 'EMPLOYEE',
      isActive: true,
      employeeId: 'EMP-0101',
    },
  });

  // 3. Seed sample absences and holiday credits for testing profile views
  console.log('Seeding sample absences and holiday credits...');
  const publicHoliday = await prisma.publicHoliday.upsert({
    where: { date: new Date('2026-05-01') },
    update: {},
    create: {
      label: 'Fête du Travail',
      date: new Date('2026-05-01'),
      isReligious: false,
      comment: 'Jour férié chômé et payé',
    },
  });

  // Grant holiday credits to Fatima-Zahra and Mehdi
  const credit1 = await prisma.holidayWorkCredit.findFirst({
    where: { employeeId: 'EMP-0101', publicHolidayId: publicHoliday.id },
  });
  if (!credit1) {
    await prisma.holidayWorkCredit.create({
      data: {
        employeeId: 'EMP-0101',
        publicHolidayId: publicHoliday.id,
        creditedDays: 1.0,
        consumedDays: 0,
        isFullyConsumed: false,
        comment: 'Permanence technique assurée durant le jour férié légal.',
      },
    });
  }

  const credit2 = await prisma.holidayWorkCredit.findFirst({
    where: { employeeId: 'EMP-0104', publicHolidayId: publicHoliday.id },
  });
  if (!credit2) {
    await prisma.holidayWorkCredit.create({
      data: {
        employeeId: 'EMP-0104',
        publicHolidayId: publicHoliday.id,
        creditedDays: 2.0,
        consumedDays: 1.0,
        isFullyConsumed: false,
        comment: 'Supervision de maintenance exceptionnelle.',
      },
    });
  }

  // Sample Absence for Fatima-Zahra
  const existingAbsence = await prisma.absence.findFirst({
    where: { employeeId: 'EMP-0101', startDate: new Date('2026-07-10') },
  });
  if (!existingAbsence) {
    await prisma.absence.create({
      data: {
        employeeId: 'EMP-0101',
        typeId: types.congePaye.id,
        startDate: new Date('2026-07-10'),
        endDate: new Date('2026-07-15'),
        calculatedWorkingDays: 5.0,
        enteredDays: 5.0,
        retainedDays: 5.0,
        fraction: 'FULL_DAY',
        status: 'APPROVED',
        supportingDocumentProvided: false,
        comment: 'Congé d été annuel validé.',
      },
    });
  }

  const existingAbsence2 = await prisma.absence.findFirst({
    where: { employeeId: 'EMP-0101', startDate: new Date('2026-09-02') },
  });
  if (!existingAbsence2) {
    await prisma.absence.create({
      data: {
        employeeId: 'EMP-0101',
        typeId: types.recuperation.id,
        startDate: new Date('2026-09-02'),
        endDate: new Date('2026-09-02'),
        calculatedWorkingDays: 1.0,
        enteredDays: 1.0,
        retainedDays: 1.0,
        fraction: 'FULL_DAY',
        status: 'PENDING',
        supportingDocumentProvided: false,
        comment: 'Récupération de la permanence du 1er Mai.',
      },
    });
  }

  console.log('Database seeded successfully!');
}

if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
