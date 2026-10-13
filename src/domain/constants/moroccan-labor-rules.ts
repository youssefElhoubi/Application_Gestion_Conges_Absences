/**
 * Statutory Constants & Moroccan Labor Code Rules (Loi n° 65-99)
 * Explicitly customized per organization business rules.
 */

export const MOROCCAN_LABOR_RULES = {
  // Annual Leave Accrual Rates (Days per completed month of service)
  ANNUAL_LEAVE: {
    ADULT_RATE_PER_MONTH: 1.5, // 18 working days / year
    MINOR_RATE_PER_MONTH: 2.0, // 24 working days / year (under 18)
    MINOR_AGE_THRESHOLD_YEARS: 18,
    MINIMUM_SENIORITY_MONTHS_ENTITLEMENT: 6, // Art. 231: Acquis après 6 mois de service continu
    MAX_YEARLY_BALANCE_CAP: 30.0, // Statutory ceiling: 30 days
  },

  // Statutory Exceptional Permissions (Art. 274 & Art. 269) - Paid & Non-deductible
  EXCEPTIONAL_PERMISSIONS: {
    MARRIAGE_EMPLOYEE: {
      code: 'MARIAGE_SALARIE',
      allowedDays: 4.0,
      label: 'Mariage du salarié',
      description: 'Marriage of employee',
    },
    MARRIAGE_CHILD: {
      code: 'MARIAGE_ENFANT',
      allowedDays: 2.0,
      label: "Mariage d'un enfant du salarié",
      description: 'Marriage of employee child',
    },
    BIRTH_CHILD: {
      code: 'NAISSANCE_ENFANT',
      allowedDays: 3.0,
      label: 'Naissance d’un enfant (Congé de paternité)',
      description: 'Birth of child (Paternity leave, 3 days continuous or discontinuous)',
    },
    DEATH_DIRECT_FAMILY: {
      code: 'DECES_FAMILLE_PROCHE',
      allowedDays: 2.0,
      label: 'Décès (conjoint, enfant, parent, beau-parent)',
      description: 'Death of spouse, child, parent, or parent in law',
    },
    DEATH_SIBLING: {
      code: 'DECES_FRERE_SOEUR',
      allowedDays: 1.0,
      label: 'Décès d’un frère ou d’une sœur',
      description: 'Death of sibling',
    },
  },

  // Recovery Leave (Repos Compensateur)
  RECOVERY_LEAVE: {
    CREDIT_PER_HOLIDAY_WORKED: 1.0, // 1 recovery day earned per public holiday worked
    NEVER_EXPIRES: true,
  },

  // Default Standard Calendar Exclusions
  CALENDAR: {
    DEFAULT_WEEKLY_REST_DAYS: [0], // 0 = Sunday (default private sector in Morocco)
    PUBLIC_HOLIDAYS_CONSUME_LEAVE: false, // Statutory rule: Public holidays are non-deductible
  },
} as const;

export type ExceptionalReasonCode = keyof typeof MOROCCAN_LABOR_RULES.EXCEPTIONAL_PERMISSIONS;
