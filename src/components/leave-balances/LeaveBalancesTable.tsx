"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { DataTable, SortDirection } from "@/src/components/table/DataTable";
import { getLeaveBalancesTableColumns } from "./leave-balance-table-columns";
import { LeaveBalanceMobileCard } from "./LeaveBalanceMobileCard";
import { LEAVE_BALANCES_PAGE_SIZE_OPTIONS } from "@/src/lib/leave-balances/leave-balance.constants";
import type { EmployeeCounterItem } from "@/src/lib/api/counter-client";

export interface LeaveBalancesTableProps {
  counters: EmployeeCounterItem[];
  totalItems: number;
  isLoading: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: SortDirection;
  onSortChange: (columnId: string, direction: SortDirection) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onResetFilters: () => void;
  onRowClick?: (row: EmployeeCounterItem) => void;
}

export const LeaveBalancesTable: React.FC<LeaveBalancesTableProps> = ({
  counters,
  totalItems,
  isLoading,
  page,
  pageSize,
  sortBy,
  sortDirection,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onResetFilters,
  onRowClick,
}) => {
  const router = useRouter();

  const handleNavigate = React.useCallback(
    (employeeId: string) => {
      router.push(`/leave-balances/${encodeURIComponent(employeeId)}`);
    },
    [router]
  );

  const columns = React.useMemo(
    () => getLeaveBalancesTableColumns(handleNavigate),
    [handleNavigate]
  );

  const renderMobileCard = React.useCallback(
    (row: EmployeeCounterItem) => (
      <LeaveBalanceMobileCard
        row={row}
        onClick={(r) => {
          if (onRowClick) {
            onRowClick(r);
          } else {
            handleNavigate(r.employeeId);
          }
        }}
      />
    ),
    [handleNavigate, onRowClick]
  );

  return (
    <DataTable
      columns={columns}
      data={counters}
      keyExtractor={(row) => row.employeeId}
      isLoading={isLoading}
      renderMobileCard={renderMobileCard}
      ariaLabel="Vue consolidée des soldes de congés des collaborateurs"
      emptyTitle="Aucun solde trouvé"
      emptyDescription="Aucun collaborateur ne correspond aux critères de recherche ou aux filtres sélectionnés."
      emptyIcon={<Briefcase className="h-10 w-10 text-muted-foreground/60" />}
      emptyActionLabel="Réinitialiser les filtres"
      onEmptyAction={onResetFilters}
      page={page}
      pageSize={pageSize}
      totalItems={totalItems}
      pageSizeOptions={[...LEAVE_BALANCES_PAGE_SIZE_OPTIONS]}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={(row) => {
        if (onRowClick) {
          onRowClick(row);
        } else {
          handleNavigate(row.employeeId);
        }
      }}
    />
  );
};
