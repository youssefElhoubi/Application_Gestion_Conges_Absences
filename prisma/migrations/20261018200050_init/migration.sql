-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HR_MANAGER', 'SUPERVISOR', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "AbsenceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Fraction" AS ENUM ('FULL_DAY', 'HALF_DAY_MORNING', 'HALF_DAY_AFTERNOON');

-- CreateEnum
CREATE TYPE "RuleUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS', 'PERCENTAGE', 'RATIO');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'CORRECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "employeeId" VARCHAR(50),
    "lastLoginAt" TIMESTAMPTZ(6),
    "passwordChangedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(50) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "familyId" VARCHAR(50) NOT NULL,
    "userAgent" VARCHAR(255),
    "ipAddress" VARCHAR(45),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitLedger" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "lastAttempt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetAt" TIMESTAMPTZ(6) NOT NULL,
    "blockedUntil" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RateLimitLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Africa/Casablanca',
    "weeklyRestDays" INTEGER[] DEFAULT ARRAY[0]::INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "employeeId" VARCHAR(50) NOT NULL,
    "cin" VARCHAR(20) NOT NULL,
    "cnssNumber" VARCHAR(20),
    "fullName" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "siteId" INTEGER NOT NULL,
    "jobTitle" VARCHAR(100),
    "department" VARCHAR(100),
    "birthDate" DATE,
    "hireDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "observation" TEXT,
    "managerId" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("employeeId")
);

-- CreateTable
CREATE TABLE "AbsenceType" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "isDeductible" BOOLEAN NOT NULL DEFAULT true,
    "requiresJustification" BOOLEAN NOT NULL DEFAULT false,
    "colorHex" VARCHAR(7) NOT NULL DEFAULT '#2563eb',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AbsenceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceReason" (
    "id" SERIAL NOT NULL,
    "typeId" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "allowedDays" DECIMAL(5,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AbsenceReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" BIGSERIAL NOT NULL,
    "employeeId" VARCHAR(50) NOT NULL,
    "typeId" INTEGER NOT NULL,
    "reasonId" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "fraction" "Fraction" NOT NULL DEFAULT 'FULL_DAY',
    "calculatedWorkingDays" DECIMAL(5,2) NOT NULL,
    "enteredDays" DECIMAL(5,2) NOT NULL,
    "retainedDays" DECIMAL(5,2) NOT NULL,
    "supportingDocumentProvided" BOOLEAN NOT NULL DEFAULT false,
    "status" "AbsenceStatus" NOT NULL DEFAULT 'PENDING',
    "requestDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "rejectionReason" VARCHAR(255),
    "approvedById" VARCHAR(50),
    "approvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalHistory" (
    "id" BIGSERIAL NOT NULL,
    "absenceId" BIGINT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "fromStatus" "AbsenceStatus" NOT NULL,
    "toStatus" "AbsenceStatus" NOT NULL,
    "performedByUserId" VARCHAR(50),
    "performedByEmployeeId" VARCHAR(50),
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" BIGSERIAL NOT NULL,
    "date" DATE NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "isReligious" BOOLEAN NOT NULL DEFAULT false,
    "comment" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayWorkCredit" (
    "id" BIGSERIAL NOT NULL,
    "employeeId" VARCHAR(50) NOT NULL,
    "publicHolidayId" BIGINT NOT NULL,
    "creditedDays" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "consumedDays" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "isFullyConsumed" BOOLEAN NOT NULL DEFAULT false,
    "recordedByUserId" VARCHAR(50),
    "comment" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "HolidayWorkCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRule" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "unit" "RuleUnit" NOT NULL DEFAULT 'DAYS',
    "description" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LeaveRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_employeeId_idx" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_isRevoked_idx" ON "Session"("userId", "isRevoked");

-- CreateIndex
CREATE INDEX "Session_familyId_idx" ON "Session"("familyId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitLedger_key_key" ON "RateLimitLedger"("key");

-- CreateIndex
CREATE INDEX "RateLimitLedger_resetAt_idx" ON "RateLimitLedger"("resetAt");

-- CreateIndex
CREATE INDEX "RateLimitLedger_blockedUntil_idx" ON "RateLimitLedger"("blockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "Site_code_key" ON "Site"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

-- CreateIndex
CREATE INDEX "Site_city_active_idx" ON "Site"("city", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cin_key" ON "Employee"("cin");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cnssNumber_key" ON "Employee"("cnssNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_siteId_active_idx" ON "Employee"("siteId", "active");

-- CreateIndex
CREATE INDEX "Employee_managerId_idx" ON "Employee"("managerId");

-- CreateIndex
CREATE INDEX "Employee_hireDate_idx" ON "Employee"("hireDate");

-- CreateIndex
CREATE INDEX "Employee_active_idx" ON "Employee"("active");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceType_code_key" ON "AbsenceType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceType_name_key" ON "AbsenceType"("name");

-- CreateIndex
CREATE INDEX "AbsenceType_active_idx" ON "AbsenceType"("active");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceReason_code_key" ON "AbsenceReason"("code");

-- CreateIndex
CREATE INDEX "AbsenceReason_typeId_active_idx" ON "AbsenceReason"("typeId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceReason_name_typeId_key" ON "AbsenceReason"("name", "typeId");

-- CreateIndex
CREATE INDEX "Absence_employeeId_startDate_endDate_idx" ON "Absence"("employeeId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Absence_employeeId_status_idx" ON "Absence"("employeeId", "status");

-- CreateIndex
CREATE INDEX "Absence_status_startDate_idx" ON "Absence"("status", "startDate");

-- CreateIndex
CREATE INDEX "Absence_typeId_idx" ON "Absence"("typeId");

-- CreateIndex
CREATE INDEX "Absence_startDate_endDate_idx" ON "Absence"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ApprovalHistory_absenceId_createdAt_idx" ON "ApprovalHistory"("absenceId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalHistory_performedByUserId_idx" ON "ApprovalHistory"("performedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicHoliday_date_key" ON "PublicHoliday"("date");

-- CreateIndex
CREATE INDEX "PublicHoliday_date_idx" ON "PublicHoliday"("date");

-- CreateIndex
CREATE INDEX "HolidayWorkCredit_employeeId_isFullyConsumed_idx" ON "HolidayWorkCredit"("employeeId", "isFullyConsumed");

-- CreateIndex
CREATE UNIQUE INDEX "HolidayWorkCredit_employeeId_publicHolidayId_key" ON "HolidayWorkCredit"("employeeId", "publicHolidayId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRule_code_key" ON "LeaveRule"("code");

-- CreateIndex
CREATE INDEX "LeaveRule_active_idx" ON "LeaveRule"("active");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("employeeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("employeeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceReason" ADD CONSTRAINT "AbsenceReason_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "AbsenceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "AbsenceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "AbsenceReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "Absence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayWorkCredit" ADD CONSTRAINT "HolidayWorkCredit_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayWorkCredit" ADD CONSTRAINT "HolidayWorkCredit_publicHolidayId_fkey" FOREIGN KEY ("publicHolidayId") REFERENCES "PublicHoliday"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
