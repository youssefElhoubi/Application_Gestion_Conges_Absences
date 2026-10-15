"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { TableSkeleton } from "@/src/components/feedback/LoadingSkeleton";
import { EmptyState } from "@/src/components/feedback/EmptyState";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import { cn } from "@/src/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
}

export type ColumnDef<T> = DataTableColumn<T>;

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor?: (row: T, index: number) => string | number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  // Sorting
  sortBy?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (columnId: string, direction: SortDirection) => void;
  // Pagination
  page?: number;
  pageSize?: number;
  totalItems?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  // Selection
  isSelectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  batchActions?: React.ReactNode;
  // Row action click
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  onEmptyAction,
  emptyActionLabel,
  // Sorting
  sortBy,
  sortDirection,
  onSortChange,
  // Pagination
  page = 1,
  pageSize = 10,
  totalItems,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  // Selection
  isSelectable = false,
  selectedIds = [],
  onSelectionChange,
  batchActions,
  onRowClick,
  className,
}: DataTableProps<T>) {
  // Client-side fallback sorting if onSortChange is not controlled
  const [internalSortBy, setInternalSortBy] = React.useState<string | null>(sortBy ?? null);
  const [internalSortDir, setInternalSortDir] = React.useState<SortDirection>(sortDirection ?? null);

  const activeSortBy = sortBy !== undefined ? sortBy : internalSortBy;
  const activeSortDir = sortDirection !== undefined ? sortDirection : internalSortDir;

  const handleHeaderClick = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;

    let nextDir: SortDirection = "asc";
    if (activeSortBy === column.id) {
      if (activeSortDir === "asc") nextDir = "desc";
      else if (activeSortDir === "desc") nextDir = null;
      else nextDir = "asc";
    }

    if (onSortChange) {
      onSortChange(column.id, nextDir);
    } else {
      setInternalSortBy(nextDir ? column.id : null);
      setInternalSortDir(nextDir);
    }
  };

  // Row selection logic
  const getItemKey = React.useCallback(
    (item: T, idx: number): string | number => {
      if (keyExtractor) return keyExtractor(item, idx);
      const anyItem = item as Record<string, any>;
      return anyItem.id ?? anyItem.employeeId ?? idx;
    },
    [keyExtractor]
  );

  const isAllSelected =
    data.length > 0 &&
    data.every((item, i) => selectedIds.includes(getItemKey(item, i)));

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      const allKeys = data.map((item, i) => getItemKey(item, i));
      onSelectionChange(allKeys);
    }
  };

  const handleSelectRow = (key: string | number) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(key)) {
      onSelectionChange(selectedIds.filter((id) => id !== key));
    } else {
      onSelectionChange([...selectedIds, key]);
    }
  };

  // Pagination calculation
  const total = totalItems !== undefined ? totalItems : data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toItem = Math.min(total, page * pageSize);

  const alignStyles = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Batch Actions Bar (visible when rows selected) */}
      {isSelectable && selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs animate-in fade-in">
          <span className="font-medium text-primary">
            {selectedIds.length} élément{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
          </span>
          {batchActions && <div className="flex items-center gap-2">{batchActions}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-medium tracking-wider">
              <tr>
                {isSelectable && (
                  <th className="w-10 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded-sm border-input text-primary focus:ring-ring cursor-pointer"
                      aria-label="Sélectionner tous les éléments"
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const isSorted = activeSortBy === col.id;
                  return (
                    <th
                      key={col.id}
                      style={{ width: col.width }}
                      onClick={() => handleHeaderClick(col)}
                      className={cn(
                        "px-4 py-3.5 whitespace-nowrap transition-colors",
                        alignStyles[col.align ?? "left"],
                        col.sortable && "cursor-pointer hover:text-foreground select-none",
                        col.className
                      )}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          col.align === "right" && "justify-end",
                          col.align === "center" && "justify-center"
                        )}
                      >
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="shrink-0 text-muted-foreground/80">
                            {isSorted && activeSortDir === "asc" && (
                              <ChevronUp className="h-3.5 w-3.5 text-primary" />
                            )}
                            {isSorted && activeSortDir === "desc" && (
                              <ChevronDown className="h-3.5 w-3.5 text-primary" />
                            )}
                            {(!isSorted || !activeSortDir) && (
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + (isSelectable ? 1 : 0)}
                    className="p-0"
                  >
                    <TableSkeleton rows={pageSize > 5 ? 5 : pageSize} columns={columns.length} />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (isSelectable ? 1 : 0)}
                    className="p-8 text-center"
                  >
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      icon={emptyIcon}
                      onAction={onEmptyAction}
                      actionLabel={emptyActionLabel}
                      className="border-0 bg-transparent py-4"
                    />
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const key = getItemKey(row, idx);
                  const isSelected = selectedIds.includes(key);

                  return (
                    <tr
                      key={key}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        "transition-colors hover:bg-muted/40",
                        isSelected && "bg-primary/5",
                        onRowClick && "cursor-pointer"
                      )}
                    >
                      {isSelectable && (
                        <td
                          className="w-10 px-4 py-3.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(key)}
                            className="h-4 w-4 rounded-sm border-input text-primary focus:ring-ring cursor-pointer"
                            aria-label={`Sélectionner la ligne ${idx + 1}`}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className={cn(
                            "px-4 py-3.5 text-sm text-foreground",
                            alignStyles[col.align ?? "left"],
                            col.className
                          )}
                        >
                          {col.cell
                            ? col.cell(row, idx)
                            : col.accessorKey
                            ? String(row[col.accessorKey] ?? "—")
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border bg-card/60 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Lignes par page:</span>
              {onPageSizeChange ? (
                <div className="w-16">
                  <Select
                    value={String(pageSize)}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="h-7 text-xs px-2 py-0"
                    options={pageSizeOptions.map((opt) => ({
                      value: String(opt),
                      label: String(opt),
                    }))}
                  />
                </div>
              ) : (
                <span className="font-semibold text-foreground">{pageSize}</span>
              )}
              <span className="ml-2">
                Affichage de <span className="font-medium text-foreground">{fromItem}</span> à{" "}
                <span className="font-medium text-foreground">{toItem}</span> sur{" "}
                <span className="font-medium text-foreground">{total}</span>
              </span>
            </div>

            {onPageChange && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page <= 1 || isLoading}
                  onClick={() => onPageChange(1)}
                  aria-label="Première page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page <= 1 || isLoading}
                  onClick={() => onPageChange(page - 1)}
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                <span className="px-2 font-medium text-foreground">
                  Page {page} sur {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => onPageChange(page + 1)}
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => onPageChange(totalPages)}
                  aria-label="Dernière page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
