# Architecture Review & Implementation Plan: Leave Balances & Counters Module

> **Date:** October 15, 2026  
> **Target System:** Leave & Absence Management System (Morocco - Loi 65-99)  
> **Status:** Codebase Inspected & Verified — Implementation Plan Formulated (Feature Not Implemented Yet)

---

## 1. Executive Summary & Specification Context

This document captures the comprehensive architectural review of the existing Leave & Absence Management codebase and establishes a verified implementation plan for the **Leave Balances and Counters** module.

### Specification File Status
- A workspace search for `LEAVE_BALANCES_SPEC.md` confirmed that **the file does not exist on disk** in the repository or user directory.
- Rather than inventing ungrounded assumptions, all requirements in this plan are derived directly from the explicit requirements set forth in the prompt, verified against the existing domain models, calculators, and API contracts.

### Core Architectural Finding: Dynamic Calculation Engine
- **No Static Counter Table in the Database:** The Prisma schema (`prisma/schema.prisma`) intentionally **does not store static leave counters or balances**.
- **Real-Time Statutory Calculation:** In compliance with Moroccan Labor Law (Loi n° 65-99, Articles 231, 232, 241, 274), leave entitlements, accruals, recovery credits, and balances are computed **dynamically in real-time** via `LeaveBalanceService.getDynamicBalance()` using `BalanceCalculator`, `AnnualLeaveAccrualCalculator`, and `RecoveryBalanceCalculator`.
- **Pre-existing Backend Capabilities:** The backend **already exposes** authoritative dynamic calculations via:
  - `GET /api/counters` (Multi-employee paginated counter overview with site/active filtering and search).
  - `GET /api/employees/[id]/counters` (Single employee dynamic balance breakdown).
  - `GET /api/me` (Authenticated personal balance profile for Self-Service Portal).

---

## 2. Technology Stack & Framework Conventions

| Layer | Technology | Version | Key Notes & Architectural Constraints |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.4.0` | Uses React Server Components, Route Handlers, Turbopack, and Partial Prerendering (`next dev`, `next build`). |
| **UI Library** | React | `19.3.0` | Client components must declare `"use client"`. Avoid synchronous state updates in effects. |
| **Styling** | Tailwind CSS | `v4.0.0` | Uses modern CSS variables, `@theme`, `@tailwindcss/turbopack`, dark mode classes (`dark:`), and CSS utility classes. |
| **Icons** | Lucide React | `^1.56.0` | Clean enterprise icons (`Briefcase`, `Calendar`, `Sparkles`, `Clock`, `Shield`, `Award`, etc.). |
| **Database & ORM** | Prisma Client with PostgreSQL | `^7.10.0` | PostgreSQL adapter (`@prisma/adapter-pg`, `pg`). Client output at `@/src/generated/prisma`. |
| **Validation** | Zod | `^4.6.7` | Used for query schemas, request validation, and form parsing. |
| **Serialization** | Custom Serializer | `src/server/serializers/response.serializer.ts` | Required for all JSON route responses to serialize Prisma `BigInt` (to `string`) and `Decimal` (to `number`). |
| **Testing** | Vitest & Playwright | Vitest `5.0.4`, Playwright `1.64.0` | Unit and integration test suites run via `vitest run`. E2E runs via `playwright test`. |

---

## 3. Relevant Files and Responsibilities Matrix

### 3.1 Domain & Business Calculations Layer (`src/domain/`)

| File Path | Responsibilities | Key Functions / Types |
| :--- | :--- | :--- |
| [`src/domain/types/business-logic.types.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/domain/types/business-logic.types.ts) | Authoritative TypeScript contracts for domain engine calculations. | `DynamicBalanceResult`, `EmployeeProfileContext`, `WorkingDaysCalculationContext`, `WorkingDaysResult` |
| [`src/domain/engine/leave-calculation.engine.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/domain/engine/leave-calculation.engine.ts) | Unified static facade exposing all 8 statutory labor law calculation algorithms. | `calculateAnnualLeaveAcquisition`, `calculateSeniority`, `calculateAge`, `calculateWorkingDays`, `calculateLeaveBalance`, `calculateRecoveryBalance` |
| [`src/domain/calculations/balance.calculator.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/domain/calculations/balance.calculator.ts) | Dynamic balance aggregation: Statutory Accrual + Recovery Credits - Approved Deductions. | `BalanceCalculator.calculate(components: RawBalanceComponents): DynamicBalanceResult` |
| [`src/domain/calculations/annual-leave-accrual.calculator.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/domain/calculations/annual-leave-accrual.calculator.ts) | Moroccan Labor Code statutory acquisition (Art. 231 & 232): 1.5d adult / 2.0d minor per month, +1.5d/5yr seniority, 30d cap, 6-month gate. | `AnnualLeaveAccrualCalculator.calculateAccrual()` |
| [`src/domain/calculations/recovery-balance.calculator.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/domain/calculations/recovery-balance.calculator.ts) | Recovery credits calculation for worked public holidays (never expire) & FIFO consumption simulation. | `RecoveryBalanceCalculator.calculateBalance()`, `RecoveryBalanceCalculator.planFifoConsumption()` |
| [`src/domain/calculations/age-seniority.calculator.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/domain/calculations/age-seniority.calculator.ts) | Seniority (months/years) and age/minority calculations based on Moroccan Labor Code. | `calculateSeniorityMonths`, `calculateSeniorityYears`, `isMinor` |
| [`src/domain/constants/moroccan-labor-rules.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/domain/constants/moroccan-labor-rules.ts) | Statutory constants (1.5 adult rate, 2.0 minor rate, 6 months threshold, 30 days cap, 5-year bonus blocks). | `MOROCCAN_LABOR_RULES` |
| [`src/domain/validation/leave-validation.rules.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/domain/validation/leave-validation.rules.ts) | Validation invariants (seniority lock, balance exhaustion, overlapping requests, statutory caps). | `LeaveValidationRules.validate()` |

### 3.2 Application Services & Modules (`src/modules/` & `src/application/`)

| File Path | Responsibilities | Key Functions / Exports |
| :--- | :--- | :--- |
| [`src/application/services/leave-balance.service.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/application/services/leave-balance.service.ts) | Real-time database aggregation of employee site schedule, unconsumed recovery credits, and approved deductible leaves. | `LeaveBalanceService.getDynamicBalance(employeeId, referenceDate)` |
| [`src/modules/counters/counter.service.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/modules/counters/counter.service.ts) | Business service for multi-employee and single-employee balance queries with RBAC scoping and pagination. | `CounterService.getMultiEmployeeCounters()`, `CounterService.getEmployeeCounters()` |
| [`src/modules/counters/counter.schema.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/modules/counters/counter.schema.ts) | Zod schema for multi-employee balance queries. | `MultiEmployeeCounterQuerySchema`, `MultiEmployeeCounterQuery` |
| [`src/modules/employees/employee.service.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/modules/employees/employee.service.ts) | Full employee lifecycle, profile with calculated age/seniority, employee listing, and balance retrieval. | `EmployeeService.getEmployeeById()`, `EmployeeService.getEmployeeBalances()`, `EmployeeService.listEmployees()` |
| [`src/modules/holiday-work-credits/holiday-work-credit.service.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/modules/holiday-work-credits/holiday-work-credit.service.ts) | Recovery credits management: granting credits for worked holidays, corrections, list with employee/holiday details. | `HolidayWorkCreditService.grantCredit()`, `HolidayWorkCreditService.listCredits()`, `HolidayWorkCreditService.correctCredit()` |
| [`src/modules/absences/absence.service.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/modules/absences/absence.service.ts) | Absence request lifecycle: creation with balance pre-check, listing, approval with concurrency balance check, rejection, cancellation. | `AbsenceService.createAbsenceRequest()`, `AbsenceService.approveAbsence()`, `AbsenceService.listAbsences()` |
| [`src/modules/auth/auth.guard.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/modules/auth/auth.guard.ts) | Centralized RBAC guard (`ADMIN`, `HR_MANAGER`, `SUPERVISOR`, `EMPLOYEE`), self-approval prohibition. | `AuthGuard.requireRole()`, `AuthGuard.requireAccessEmployee()`, `AuthGuard.canReviewAbsence()` |
| [`src/modules/auth/session.resolver.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/modules/auth/session.resolver.ts) | Resolves user identity and permissions via Authorization header, cookies, or `x-user-id`. | `SessionResolver.resolve()`, `SessionResolver.require()` |

### 3.3 API Route Handlers (`src/app/api/`)

| Route | HTTP Method | Handler File | Response Contract | Authoritative? |
| :--- | :--- | :--- | :--- | :--- |
| `/api/counters` | `GET` | [`src/app/api/counters/route.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/api/counters/route.ts) | `PaginatedResult<DynamicBalanceResult & { fullName: string; siteName?: string; jobTitle?: string }>` | **Yes** |
| `/api/employees/[id]/counters` | `GET` | [`src/app/api/employees/[id]/counters/route.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/api/employees/%5Bid%5D/counters/route.ts) | `DynamicBalanceResult` | **Yes** |
| `/api/employees` | `GET`, `POST` | [`src/app/api/employees/route.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/api/employees/route.ts) | `PaginatedResult<EmployeeListItem>` | **Yes** |
| `/api/employees/[id]` | `GET`, `PATCH` | [`src/app/api/employees/[id]/route.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/api/employees/%5Bid%5D/route.ts) | `EmployeeDetail` (includes calculated age & seniority metrics) | **Yes** |
| `/api/absences` | `GET`, `POST` | [`src/app/api/absences/route.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/api/absences/route.ts) | `PaginatedResult<AbsenceListItem>` | **Yes** |
| `/api/holiday-work-credits` | `GET`, `POST` | [`src/app/api/holiday-work-credits/route.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/api/holiday-work-credits/route.ts) | `PaginatedResult<HolidayWorkCreditItem>` | **Yes** |
| `/api/me` | `GET` | [`src/app/api/me/route.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/api/me/route.ts) | `PortalProfileData` (personal user, employee, balances, upcoming leaves/holidays, credits) | **Yes** |

### 3.4 Client API Utilities & UI Pages (`src/lib/api/` & `src/app/`)

| File Path | Description & Current State |
| :--- | :--- |
| [`src/lib/api/employee-client.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/lib/api/employee-client.ts) | Client wrapper for `/api/employees`. **Contract Mismatch Identified:** Defines legacy `EmployeeBalances` with properties (`accruedDays`, `remainingPaidBalance`, `takenApprovedDays`, `pendingDays`, `recoveryCreditsTotal`) that do not match `DynamicBalanceResult`. |
| [`src/lib/api/portal-client.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/lib/api/portal-client.ts) | Client wrapper for employee self-service portal (`/api/me`, `/api/absences`, etc.). |
| [`src/lib/api/holiday-client.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/lib/api/holiday-client.ts) | Client wrapper for public holidays and recovery credit management. |
| [`src/lib/api/absence-client.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/lib/api/absence-client.ts) | Client wrapper for absences and statutory calculation preview (`/api/absences/calculate`). |
| [`src/components/layout/Sidebar.tsx`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/layout/Sidebar.tsx) | Navigation sidebar. Already links to `{ title: "Soldes de congés", href: "/leave-balances", icon: Briefcase }`! |
| [`src/app/employees/[id]/page.tsx`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/employees/%5Bid%5D/page.tsx) | Employee Profile page with Overview, Absences, and Recovery Credits tabs. Overview tab currently displays 0 balances due to the DTO contract mismatch. |
| [`src/app/leave-balances/page.tsx`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/leave-balances/page.tsx) | **Missing route:** The sidebar links here, but the route handler and page component have not yet been created. |

---

## 4. Existing Reusable UI Components Catalog

The codebase features a well-developed component library built with Tailwind CSS v4 and Lucide React. **These components must be reused directly instead of re-inventing new ones:**

| Category | Component & File | Capabilities & Usage Notes |
| :--- | :--- | :--- |
| **Page Layout** | [`PageContainer`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/layout/PageContainer.tsx) | Standard page wrapper ensuring uniform padding, responsive max-width, and consistent spacing across all pages. |
| **Headers** | [`PageHeader`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/shared/PageHeader.tsx)<br>[`SectionHeader`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/shared/SectionHeader.tsx) | `PageHeader` provides title, description, badge, breadcrumbs/back-link, and action buttons. `SectionHeader` provides in-page group titles with icon and subtitle. |
| **Metrics & Cards** | [`StatCard`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/shared/StatCard.tsx)<br>[`DataCard`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/shared/DataCard.tsx)<br>[`Card`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/ui/card.tsx) | `StatCard` supports title, value, unit, description, trend, icon, and semantic color states (`primary`, `success`, `warning`, `danger`). `DataCard` provides bordered containers with action slots. |
| **Data Tables** | [`DataTable<T>`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/table/DataTable.tsx) | Full enterprise table supporting:<br>• Generic row typing `<T>` with `DataTableColumn<T>`<br>• Controlled or client-side sorting with direction indicators (`asc`, `desc`)<br>• Full pagination bar (page numbers, rows per page selector `10, 25, 50`, first/last/next/prev controls)<br>• Integrated skeleton loading (`isLoading`) and empty state (`emptyTitle`, `emptyDescription`)<br>• Row selection checkboxes and batch action bar<br>• Clickable row navigation (`onRowClick`) |
| **Filters & Search** | [`FilterBar`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/shared/FilterBar.tsx)<br>[`SearchInput`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/shared/SearchInput.tsx)<br>[`Select`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/ui/select.tsx) | `FilterBar` combines debounce search, dropdown filters, active filter pills with dismiss buttons, results counter, and a reset button. |
| **Badges & Status** | [`StatusBadge`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/shared/StatusBadge.tsx)<br>[`Badge`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/ui/badge.tsx) | `StatusBadge` formats system statuses (`ACTIVE`, `INACTIVE`, `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`) with standardized colors and dot indicators. |
| **Feedback States** | [`TableSkeleton`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/feedback/LoadingSkeleton.tsx)<br>[`CardGridSkeleton`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/feedback/LoadingSkeleton.tsx)<br>[`EmptyState`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/feedback/EmptyState.tsx)<br>[`ErrorState`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/feedback/ErrorState.tsx)<br>[`Alert`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/feedback/Alert.tsx) | Pre-built skeleton placeholders, empty illustrations with action buttons, error recovery screens with retry callbacks, and dismissible alert banners. |
| **Employee Selectors** | Form Search Pattern (`GrantCreditModalForm`, `AbsenceModalForm`) | Dropdown with inline text search filtering employees by name, matricule ID, or site. |
| **Dialogs & Modals** | [`ConfirmDialog`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/shared/ConfirmDialog.tsx)<br>[`Dialog`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/ui/dialog.tsx) | Accessible backdrop modal with keyboard trap, loading spinner on submit, and destructive/primary variants. |

---

## 5. Verified Data Map for Leave Balances & Counters

Every required UI data point is mapped below to its verified source in the codebase:

| UI Information Requirement | Existing Source (File & Endpoint/Service) | Authoritative? | Safe for Frontend Display? | Missing Capabilities & Action Needed |
| :--- | :--- | :--- | :--- | :--- |
| **1. Employee Identity, Matricule ID, Site, Job Title, Hire Date, Status** | • `GET /api/employees/[id]` (`EmployeeService.getEmployeeById`)<br>• `GET /api/counters` (`CounterService.getMultiEmployeeCounters`) | **Yes** (from `Employee` table in DB) | **Yes** | • `/api/employees/[id]` returns full data.<br>• **Gap in `/api/counters`:** The Prisma `select` in `CounterService.getMultiEmployeeCounters` selects `employeeId`, `fullName`, `jobTitle`, `site`, but **omits `hireDate` and `active`**. A small addition to `CounterService` or joining is required to show hire date in the multi-employee list. |
| **2. Annual Leave Entitlement / Earned Leave** | • `GET /api/counters`<br>• `GET /api/employees/[id]/counters`<br>• `LeaveBalanceService.getDynamicBalance()`<br>• Field: `statutoryAccruedDays` & `calculationBreakdown.monthlyRateApplied` | **Yes** (calculated via Moroccan Labor Code Art. 231 & 232) | **Yes** | • Fully authoritative.<br>• **Gap:** Frontend `EmployeeBalances` interface in `employee-client.ts` expects `accruedDays` instead of `statutoryAccruedDays`. Must normalize client DTO. |
| **3. Used Leave & Remaining Leave** | • `GET /api/counters`<br>• `GET /api/employees/[id]/counters`<br>• Fields: `totalApprovedDeductions`, `netAvailableBalance` | **Yes** (summed from approved deductible absences in DB) | **Yes** | • Fully authoritative.<br>• **Gap:** Client interface `EmployeeBalances` expects `takenApprovedDays` and `remainingPaidBalance`. Must map to `totalApprovedDeductions` and `netAvailableBalance`. |
| **4. Pending Requests (Pending Days / Count)** | • `GET /api/absences?employeeId=[id]&status=PENDING` (`AbsenceService.listAbsences`) | **Yes** (from `Absence` table where `status = 'PENDING'`) | **Yes** (when queried from `/api/absences`) | • **Missing in Counter Service:** `LeaveBalanceService.getDynamicBalance` and `/api/counters` **do not aggregate pending requests**. To show pending days in the employee balance card, it must either be fetched via `AbsenceApiClient.listAbsences` or added to the counter service aggregation. |
| **5. Recovery Credits & Available Recovery Balance** | • `GET /api/counters` & `GET /api/employees/[id]/counters` (`activeRecoveryCreditDays`)<br>• `GET /api/holiday-work-credits?employeeId=[id]` (`HolidayWorkCreditService.listCredits`) | **Yes** (Moroccan rule: unconsumed holiday credits never expire) | **Yes** | • Fully authoritative.<br>• Summary available in counters; granular ledger (earned, consumed, remaining per holiday) available via `/api/holiday-work-credits`. |
| **6. Entitlement Period & Seniority Context** | • `GET /api/counters`<br>• `GET /api/employees/[id]/counters`<br>• Fields: `serviceMonths`, `serviceYears`, `isEligibleForAnnualLeave`, `calculationBreakdown.monthlyRateApplied`, `calculationBreakdown.isMinorRate`, `calculationBreakdown.maxYearlyCapEnforced` | **Yes** (computed by `AnnualLeaveAccrualCalculator` & `AgeSeniorityCalculator`) | **Yes** | • Fully authoritative.<br>• Clear statutory status: if `serviceMonths < 6`, annual leave is legally accumulated but consumption is locked. |
| **7. Relevant Absence History** | • `GET /api/absences?employeeId=[id]` (`AbsenceService.listAbsences`)<br>• `EmployeeService.getAbsenceHistory()` | **Yes** (from `Absence` table with types, reasons, working days, and status) | **Yes** | • Available and paginated via `EmployeeApiClient.getEmployeeAbsences(employeeId)`. |
| **8. Backend-Provided Balance Warnings** | • Booleans in `DynamicBalanceResult`: `!isEligibleForAnnualLeave` (locked entitlement), `maxYearlyCapEnforced` (capped at 30 days)<br>• `netAvailableBalance <= 0` | **Derived** from authoritative fields | **Yes** | • **Missing Backend Capability:** The backend does **not** emit a structured `warnings: string[]` field in counter responses. The frontend must render semantic warnings based on the authoritative booleans and balance thresholds. |

---

## 6. Contract Discrepancies & Potential Integration Risks

### Risk 1: Frontend DTO / Backend Type Mismatch
- **Issue:** In [`src/lib/api/employee-client.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/lib/api/employee-client.ts) (lines 39–51), the `EmployeeBalances` interface defines:
  ```ts
  export interface EmployeeBalances {
    employeeId: string;
    seniorityMonths: number;
    isEligible: boolean;
    accruedDays: number;
    takenApprovedDays: number;
    pendingDays: number;
    remainingPaidBalance: number;
    recoveryCreditsTotal: number;
    recoveryCreditsConsumed: number;
    recoveryCreditsRemaining: number;
    totalAvailableDays: number;
  }
  ```
  However, `/api/employees/[id]/counters` actually returns `DynamicBalanceResult`:
  ```ts
  export interface DynamicBalanceResult {
    employeeId: string;
    referenceDate: Date;
    serviceMonths: number;
    serviceYears: number;
    isEligibleForAnnualLeave: boolean;
    statutoryAccruedDays: number;
    activeRecoveryCreditDays: number;
    totalApprovedDeductions: number;
    netAvailableBalance: number;
    calculationBreakdown: { ... };
  }
  ```
- **Consequence:** In [`src/app/employees/[id]/page.tsx`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/employees/%5Bid%5D/page.tsx), `balances?.accruedDays` and `balances?.remainingPaidBalance` evaluate to `undefined`, causing balances on the employee profile page to render as `0.0 j`.
- **Mitigation:** Create a unified adapter/contract in a shared client file that safely maps `DynamicBalanceResult` to the UI view model with backwards-compatible fallbacks.

### Risk 2: Missing `hireDate` and `active` in `GET /api/counters`
- **Issue:** `CounterService.getMultiEmployeeCounters()` in [`src/modules/counters/counter.service.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/modules/counters/counter.service.ts) selects only `{ employeeId, fullName, jobTitle, site }`.
- **Consequence:** If the organization-wide overview table needs to display hire date, employee seniority date, or active status pills directly in the table, those fields are missing from `/api/counters` items.
- **Mitigation:** When implementing the multi-employee overview, display the fields available (`employeeId`, `fullName`, `siteName`, `jobTitle`, `serviceYears`, `statutoryAccruedDays`, `totalApprovedDeductions`, `activeRecoveryCreditDays`, `netAvailableBalance`, `isEligibleForAnnualLeave`).

### Risk 3: Performance of Real-Time Calculations at Scale
- **Issue:** `CounterService.getMultiEmployeeCounters` uses `Promise.all(employees.map(...))` to compute balances in real-time for each employee on the requested page.
- **Consequence:** For large page sizes (e.g. 50 or 100), 100 concurrent DB aggregate queries are executed.
- **Mitigation:** Default the overview table to `pageSize = 10` or `20` (max allowed by schema is 100) and preserve database pagination.

---

## 7. Available Navigation Routes & Conventions

The application follows Next.js App Router conventions with distinct role-based navigation zones:

```
src/app/
├── (HR & Management Views)
│   ├── page.tsx                     -> "/" (HR Dashboard Overview)
│   ├── employees/
│   │   ├── page.tsx                 -> "/employees" (Employee Directory)
│   │   └── [id]/page.tsx            -> "/employees/[id]" (Employee Profile & History)
│   ├── absences/
│   │   ├── page.tsx                 -> "/absences" (All Absences Directory & Approval Workflow)
│   │   └── [id]/page.tsx            -> "/absences/[id]" (Absence Detail View)
│   ├── recovery-credits/
│   │   └── page.tsx                 -> "/recovery-credits" (Worked Holidays Recovery Credit Ledger)
│   ├── holidays/
│   │   ├── page.tsx                 -> "/holidays" (Public Holidays Calendar & Management)
│   │   └── [id]/page.tsx            -> "/holidays/[id]" (Public Holiday Detail & Associated Credits)
│   └── leave-balances/             -> "/leave-balances" (REFERENCED IN SIDEBAR - ROUTE TO BE CREATED)
│       └── page.tsx
│
└── (Employee Self-Service Portal)
    ├── portal/
    │   ├── page.tsx                 -> "/portal" (Employee Portal Dashboard & Quick Balances)
    │   ├── profile/page.tsx         -> "/portal/profile" (Personal Profile, Contract & Balances)
    │   └── requests/
    │       ├── page.tsx             -> "/portal/requests" (Personal Leave Requests History)
    │       └── new/page.tsx         -> "/portal/requests/new" (Submit Absence Request)
```

### Cross-Module Navigation Connections
- **Sidebar:** Groups "SOLDES & CRÉDITS" links to `/leave-balances`, `/recovery-credits`, and `/holidays`.
- **Overview to Profile:** Clicking an employee in the balances table links directly to `/employees/[id]`.
- **Profile to Absences:** Tab 2 in `/employees/[id]` displays the employee's absence history with links to `/absences/[id]`.
- **Profile to Recovery Credits:** Tab 3 in `/employees/[id]` displays the employee's recovery credits ledger with links to `/recovery-credits` and `/holidays/[id]`.

---

## 8. Available Test & Validation Commands (Verified)

All commands were executed and verified on the local workspace:

| Tool / Check | Command | Verified Result | Notes |
| :--- | :--- | :--- | :--- |
| **Unit & Integration Tests** | `npm run test` or `npx vitest run` | **81 passing tests (12 test suites)** | Runs in ~4.5s. All statutory leave calculations, approval workflows, RBAC guards, and database operations pass. |
| **TypeScript Validation** | `npx tsc --noEmit` | **0 errors (Exit code 0)** | Strict TypeScript compilation passes completely across all source and test files. |
| **Production Build** | `npm run build` | **Successful (Exit code 0)** | Compiles with Turbopack in 573ms. All 27 static and dynamic route handlers prerendered cleanly. |
| **ESLint** | `npm run lint` | **165 problems (133 errors, 32 warnings)** | Strict `@typescript-eslint/no-explicit-any` errors in test files and some unused parameters. Application code complies with TypeScript types. |
| **E2E Tests** | `npm run test:e2e` | Configured with Playwright | `playwright.config.ts` targeting `http://localhost:3000`. |

---

## 9. Proposed Implementation Sequence (Small, Safe Stages)

To implement the Leave Balances and Counters module without regressions or breaking changes, the work is structured into **9 incremental stages**:

### Stage 1: Shared Formatting, DTOs & API Client Contracts
- **Scope:** Define clean TypeScript interfaces aligning `DynamicBalanceResult` with the frontend view models.
- **Files:** Create or update `src/lib/api/counter-client.ts` (or expand `employee-client.ts`) without modifying existing backend services.
- **Deliverable:** Typed client function `CounterApiClient.getMultiEmployeeCounters(query)` and `CounterApiClient.getEmployeeBalances(employeeId)` with robust fallback handling.
- **Dependencies:** None.

### Stage 2: Organization-Wide Overview Page (`/leave-balances`)
- **Scope:** Create `src/app/leave-balances/page.tsx` utilizing `PageContainer`, `PageHeader`, `StatCard`, and `DataTable`.
- **Components Reused:** `PageContainer`, `PageHeader`, `StatCard`, `DataTable`, `StatusBadge`, `TableSkeleton`, `EmptyState`, `ErrorState`.
- **Deliverable:** Responsive overview table displaying all employees with their statutory accrued days, approved deductions, recovery credits, and net available balance.
- **Dependencies:** Stage 1.

### Stage 3: Employee Search, Filters, Sorting, and Pagination
- **Scope:** Integrate `FilterBar`, site dropdown filter, active/inactive status filter, and real-time debounce search into the overview page.
- **Components Reused:** `FilterBar`, `SearchInput`, `Select`, `Button`.
- **Deliverable:** Live filtering by site ID, active status, search by employee name or matricule ID, and server-side page navigation.
- **Dependencies:** Stage 2.

### Stage 4: Employee-Specific Balance Details View
- **Scope:** Fix the DTO field mismatch in `src/app/employees/[id]/page.tsx` and build an enriched balance summary card.
- **Deliverable:** Accurate real-time rendering of statutory balance, recovery credits, seniority years/months, and statutory acquisition status on the employee profile page.
- **Dependencies:** Stage 1.

### Stage 5: Statutory Entitlement Breakdown & Seniority Context
- **Scope:** Build a dedicated entitlement breakdown sub-component showing Moroccan Labor Law context:
  - 1.5d adult vs 2.0d minor rate indicator.
  - Seniority increment (+1.5d per 5 completed years).
  - 30-day statutory cap enforcement indicator.
  - 6-month entitlement lock indicator (`isEligibleForAnnualLeave`).
- **Components Reused:** `Card`, `Badge`, `Alert`.
- **Deliverable:** Visual explanation card answering: *"How was this employee's balance calculated under Moroccan Law?"*
- **Dependencies:** Stage 4.

### Stage 6: Absence History & Recovery Credits Integration
- **Scope:** Verify and enhance cross-navigation between balance cards, the absence history table (`/api/absences?employeeId=...`), and the recovery credits ledger (`/api/holiday-work-credits?employeeId=...`).
- **Deliverable:** Seamless jumping from employee balance breakdown into individual absence records and public holiday credit entries.
- **Dependencies:** Stage 4.

### Stage 7: Loading, Empty, and Error States
- **Scope:** Ensure all balance pages and cards have graceful loading skeletons (`TableSkeleton`, `CardGridSkeleton`), clear empty states when no employees/credits match filters, and resilient error screens with retry buttons.
- **Components Reused:** `TableSkeleton`, `EmptyState`, `ErrorState`, `Alert`.
- **Deliverable:** Polished UX in network error, zero-result, and loading conditions.
- **Dependencies:** Stages 2, 3, 4.

### Stage 8: Responsive Design & Accessibility
- **Scope:** Review table responsiveness (horizontal scroll, card fallback on mobile viewports), color contrast for dark/light modes, ARIA labels on filter controls and pagination buttons, and keyboard navigation.
- **Deliverable:** Flawless mobile/tablet rendering and full WCAG accessibility compliance.
- **Dependencies:** Stages 2 through 7.

### Stage 9: Automated Testing & Regression Checks
- **Scope:** Add Vitest unit tests for the counter client DTO adapters and integration tests validating that `/leave-balances` and `/api/counters` interact seamlessly without breaking existing suites.
- **Deliverable:** 100% green test run across all unit, integration, TypeScript, and build checks.
- **Dependencies:** All previous stages.

---

## 10. Outstanding Questions & Architectural Decisions

1. **Pending Days Inclusion in Balance Cards:**
   - *Question:* Should pending leave requests be subtracted from the displayed "Net Available Balance", or shown strictly as an auxiliary badge (`X jours en attente d'approbation`)?
   - *Recommendation:* Keep the backend authoritative calculation for `netAvailableBalance` (`accrued + recovery - approved`), and display pending days as an auxiliary warning pill so HR sees that balance is under review without altering legal ledger rules.
2. **Dedicated `/leave-balances` vs `/employees/[id]`:**
   - *Confirmation:* The sidebar already contains `/leave-balances`. Creating `src/app/leave-balances/page.tsx` fulfills the global HR overview, while `src/app/employees/[id]/page.tsx` provides the deep dive for a single employee. Both work harmoniously.

---

## 10. Completed Implementation: Organization-Wide Leave Balances Overview & Discovery Controls

### 10.1 Completed Employee Discovery & Navigation Controls
1. **Employee Search by Name & Matricule ID:**
   - Case-insensitive search on `fullName` and `employeeId` matching both name and matricule patterns.
   - Debounced URL synchronization (300ms) with `search` query parameter.
   - Search query active filter pill with direct dismissal button (`« {term} » ×`).
   - Integrated `X` clear action within `SearchInput`.
   - Supervisor scoping (`where.AND`) strictly preserved when search terms are applied so supervisors cannot access unassigned employees via search.
2. **Site Filter:**
   - Dynamic site dropdown selector populated from `GET /api/sites`.
   - Synchronized with `siteId` URL parameter.
   - Active filter chip with dismiss action resetting to "Tous les sites".
3. **Active/Inactive Employee Filter:**
   - Status selector with options: "Actifs uniquement" (`true`), "Inactifs uniquement" (`false`), and "Tous les statuts" (`all`).
   - Synchronized with `active` URL parameter (defaults to active employees in accordance with `MultiEmployeeCounterQuerySchema`).
   - Active filter chip with dismiss action.
4. **Server-Side Sorting (Organization-Wide):**
   - Enabled and verified for database-backed columns:
     - `fullName` ("Collaborateur", `asc`/`desc`)
     - `employeeId` ("Matricule", `asc`/`desc`)
     - `hireDate` ("Ancienneté & Embauche", `asc`/`desc`)
     - `site` ("Site", relational ordering `site: { name: sortOrder }`)
   - Synchronized with `sortBy` and `sortOrder` URL parameters.
   - Non-default sorting reflected in active filter pills with direct reset.
5. **Standard Application Pagination:**
   - Full pagination controls via `DataTable`: first page, previous page, page indicator (`Page X sur Y`), next page, last page.
   - Rows-per-page selector with standard options (`10, 25, 50`).
   - Item range counter (`Affichage de X à Y sur Z`).
   - Synchronized with `page` and `pageSize` URL parameters.
6. **Automatic Pagination Reset & Bounds Correction:**
   - Resetting `page = 1` immediately whenever search query, site filter, active filter, sort column, sort order, or page size changes.
   - Auto-correcting `urlPage` to `maxPages` (or page 1) if filter changes or external URL parameters exceed total available pages.
7. **Clear Filters Action:**
   - Dedicated "Réinitialiser" action button in `FilterBar` displayed whenever any non-default filter, sort, or search is active.
   - "Réinitialiser les filtres" action button integrated inside the table empty state when zero results match.
   - Completely cleans URL search parameters back to default state and clears local search inputs.

### 10.2 Unsupported Filters & Sorting (Architectural Boundaries)
- **Balance-State Filtering (Unsupported):**
  - *Status:* Intentionally **NOT implemented** in the UI or backend query schema.
  - *Reasoning:* The Prisma database contains no static balance table or columns. All leave balances (`netAvailableBalance`, `statutoryAccruedDays`, `totalApprovedDeductions`, `activeRecoveryCreditDays`) are computed dynamically at runtime in Node.js via domain calculators. Filtering by balance state (e.g., negative balance, low balance, locked rights) at the SQL level is unsupported by the database schema. Implementing this client-side would require loading and computing balances for the entire organization in Node.js memory, breaking database pagination.
- **Entitlement-Period Filtering (Unsupported):**
  - *Status:* Intentionally **NOT implemented**.
  - *Reasoning:* Statutory accruals are anchored to the employee's `hireDate` and evaluated against an `asOfDate` reference timestamp. The system does not maintain predefined discrete entitlement periods (e.g. quarterly or fiscal year cycles) as queryable database entities.
- **Sorting by Balance Metrics (Unsupported):**
  - *Status:* Dynamic balance columns (`statutoryAccruedDays`, `totalApprovedDeductions`, `activeRecoveryCreditDays`, `netAvailableBalance`) are designated non-sortable in the UI.
  - *Reasoning:* Sorting on these metrics cannot be executed organization-wide by PostgreSQL/Prisma. In strict adherence to the project requirement (*"Do not simulate organization-wide sorting using only the current page"*), sorting is restricted strictly to verified database columns (`fullName`, `employeeId`, `hireDate`, `site`).

### 10.3 Files Changed & Integrated
1. [`src/components/shared/SearchInput.tsx`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/components/shared/SearchInput.tsx):
   - Fixed controlled/uncontrolled state synchronization when `value` is passed without `onChange`, enabling seamless typing in `FilterBar`.
2. [`src/modules/counters/counter.service.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/modules/counters/counter.service.ts):
   - Combined supervisor RBAC scoping with search filtering using `where.AND` so supervisor boundaries are strictly preserved during search.
   - Added relational sorting by `site` (`site: { name: sortOrder }`).
3. [`src/app/leave-balances/page.tsx`](file:///c:/Users/DailWorkStation/Desktop/absnace/src/app/leave-balances/page.tsx):
   - Completed all discovery controls: added dedicated sortable `employeeId` column, sortable `site` column, search chip in `activeFilters`, pagination bounds auto-correction, and empty state reset button.
4. [`tests/integration/leave-balances-overview.test.ts`](file:///c:/Users/DailWorkStation/Desktop/absnace/tests/integration/leave-balances-overview.test.ts):
   - Added comprehensive integration tests covering server-side sorting (`employeeId`, `hireDate`, `site`), combined search/filter/pagination, and supervisor-scoped search isolation.

### 10.4 Validation & Verification Checks Executed
- **Vitest Unit & Integration:** `npm run test` $\rightarrow$ **89 tests passed across 13 test files** (100% green).
- **TypeScript Static Analysis:** `npx tsc --noEmit` $\rightarrow$ **0 errors (clean compilation)**.
- **Production Next.js Build:** `npm run build` $\rightarrow$ **Clean build with Turbopack** in 1450ms (all 28 routes prerendered).

---

---

## 11. Completed Implementation: Employee-Specific Leave Balance Details Page

### 11.1 Route & Architectural Integration
- **Route:** `src/app/leave-balances/[id]/page.tsx` (`/leave-balances/[id]`).
- **Connection with Overview:** Table rows, employee names, and the "Détail" action buttons on `/leave-balances` navigate directly to `/leave-balances/[id]`.
- **Connection with Employee Profile:** Includes a prominent "Voir le profil collaborateur" action linking directly to `/employees/[id]` without duplicating the general employee profile.
- **Connection with Absence & Recovery Modules:** Links each approved/recent absence item to `/absences/[id]` and provides quick navigation to the complete absence directory and recovery credits ledger.

### 11.2 Authoritative Data Sources & Integration Layer
1. **Employee Profile Data:**
   - Source: `GET /api/employees/[id]` via `EmployeeApiClient.getEmployee(employeeId)`.
   - Fields: `fullName`, `employeeId`, `cin`, `email`, `jobTitle`, `department`, `site`, `hireDate`, `active`.
2. **Dynamic Balances & Statutory Breakdown:**
   - Source: `GET /api/employees/[id]/counters` via `CounterApiClient.getEmployeeCounters(employeeId)`.
   - Fields: `netAvailableBalance`, `statutoryAccruedDays`, `totalApprovedDeductions`, `activeRecoveryCreditDays`, `serviceYears`, `serviceMonths`, `isEligibleForAnnualLeave`, `referenceDate`, and `calculationBreakdown` (`monthlyRateApplied`, `isMinorRate`, `maxYearlyCapEnforced`, `unconsumedHolidayCreditsCount`).
3. **Absences & Pending Requests:**
   - Source: `GET /api/absences?employeeId=[id]` via `EmployeeApiClient.getEmployeeAbsences(employeeId)`.
   - Calculation: Pending requests (`status === 'PENDING'`) are isolated and aggregated into a distinct notice card without deducting from confirmed statutory balance until approved.
4. **Recovery Credits Ledger:**
   - Source: `GET /api/holiday-work-credits?employeeId=[id]` via `EmployeeApiClient.getEmployeeCredits(employeeId)`.
   - Fields: Public holiday details, credited days, consumed days, remaining days, and consumption status.

### 11.3 Implemented Sections
1. **Header & Back Navigation:**
   - Breadcrumb navigation (`← Retour aux soldes de congés`) returning to `/leave-balances`.
   - Page title, descriptive subtitle, and Moroccan Labor Law badge (Loi n° 65-99).
2. **Employee Header:**
   - Avatar with initials and active status badge.
   - Name, Matricule badge, Job Title, Department, Site with map pin, Hire Date, and CIN.
   - "Voir le profil collaborateur" action button routing to `/employees/[id]`.
3. **Balance Summary (KPI StatCards):**
   - **Solde Net Disponible:** Color-coded status (`emerald` for healthy $\ge 5$, `amber` for $> 0$, `destructive` for $\le 0$).
   - **Droits Acquis (Statutaire):** Accrued annual leave days with monthly rate.
   - **Congés Consommés:** Total approved deductible leaves debited.
   - **Crédits Récupération:** Available recovery credits from worked public holidays.
   - **Demandes en Attente (Notice):** Explicitly separated alert badge indicating pending days without prematurely debiting the balance.
4. **Entitlement Context (Moroccan Labor Code):**
   - Statutory acquisition rate (1.5 j/month adult vs 2.0 j/month minor).
   - Seniority context (`serviceYears` ans and `serviceMonths` mois).
   - 6-month statutory gate status (`isEligibleForAnnualLeave`): renders a prominent warning when seniority $< 6$ months that consumption is legally locked (Art. 231).
   - 30-day statutory cap enforcement indicator (Art. 232).
   - Calculation reference date (`referenceDate`).
5. **Leave Usage:**
   - Approved absences ledger detailing debited leave periods, working days count, absence type with color badge, and direct link to absence details.
6. **Recovery Credits:**
   - Breakdown of compensatory rest credits from worked public holidays showing holiday label, date, credited days, consumed days, remaining balance, and active/exhausted status.
   - Explanatory statutory notice explaining non-expiring and FIFO consumption rules.
7. **Recent Absence Activity:**
   - Chronological list of recent employee absence requests with status badges (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`).
8. **Useful Navigation:**
   - Cross-module shortcuts to employee profile, full absence history, recovery credits ledger, and balances overview.

### 11.4 Verification & Validation Checks
- **TypeScript Static Check:** `npx tsc --noEmit` $\rightarrow$ **0 errors (exit code 0)**.
- **Vitest Unit & Integration:** `npm run test` $\rightarrow$ **93 tests passed across 14 test files** (100% green).
- **Production Next.js Build:** `npm run build` $\rightarrow$ **29/29 routes prerendered cleanly** (including `◐ /leave-balances/[id]`).

### 11.5 Remaining Gaps
- None for the Leave Balances overview and employee detail views. Both routes are fully integrated with the authoritative backend calculation engine.


