"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  type Cell,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  SearchIcon,
  UnfoldMoreIcon,
  Edit02Icon,
  Delete02Icon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";

function renderCellValue<T>(cell: Cell<T, unknown>) {
  return typeof cell.column.columnDef.cell === "function"
    ? cell.column.columnDef.cell(cell.getContext())
    : (cell.getValue() ?? "—");
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  searchable?: boolean;
  pageSize?: number;
  keyExtractor?: (item: T) => string;
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  loading,
  error,
  onRetry,
  onEdit,
  onDelete,
  searchable = false,
  pageSize = 10,
  keyExtractor,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const allColumns = useMemo(() => {
    if (!onEdit && !onDelete) return columns;
    return [
      ...columns,
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(row.original)}
                aria-label="Edit"
              >
                <HugeiconsIcon icon={Edit02Icon} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(row.original)}
                aria-label="Delete"
              >
                <HugeiconsIcon icon={Delete02Icon} />
              </Button>
            )}
          </div>
        ),
      } as ColumnDef<T>,
    ];
  }, [columns, onEdit, onDelete]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border p-12 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <HugeiconsIcon icon={Alert02Icon} />
        </div>
        <div>
          <p className="text-sm font-medium">{error}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  const rows = table.getRowModel().rows;
  const headerGroup = table.getHeaderGroups()[0];
  const detailHeaders = headerGroup.headers
    .slice(1)
    .filter((header) => header.column.id !== "actions");

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative max-w-sm">
          <HugeiconsIcon
            icon={SearchIcon}
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search..."
            className="pl-9"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card">
        {isMobile ? (
          <ul className="divide-y">
            {rows.map((row) => {
              const cells = row.getVisibleCells();
              const primary = cells.find(
                (cell) => cell.column.id === headerGroup.headers[0]?.column.id,
              );
              const details = detailHeaders
                .map((header) =>
                  cells.find((cell) => cell.column.id === header.column.id),
                )
                .filter((cell): cell is Cell<T, unknown> => Boolean(cell));
              const actions = cells.find((cell) => cell.column.id === "actions");
              return (
                <li
                  key={keyExtractor ? keyExtractor(row.original) : row.id}
                  className="space-y-3 p-4"
                >
                  {primary && <div>{renderCellValue(primary)}</div>}
                  {details.length > 0 && (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {details.map((cell) => {
                        const header = detailHeaders.find(
                          (h) => h.column.id === cell.column.id,
                        );
                        const label = header?.column.columnDef.header;
                        return (
                          <div key={cell.id} className="min-w-0">
                            <dt className="text-xs text-muted-foreground">
                              {typeof label === "string"
                                ? label
                                : cell.column.id}
                            </dt>
                            <dd className="mt-0.5 min-w-0">
                              {renderCellValue(cell)}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  )}
                  {actions && renderCellValue(actions)}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b bg-muted/50">
                    {headerGroup.headers.map((header) => {
                      const label =
                        typeof header.column.columnDef.header === "string"
                          ? header.column.columnDef.header
                          : "";
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "px-4 py-3 text-left text-xs font-medium text-muted-foreground",
                            header.column.getCanSort() &&
                              "cursor-pointer select-none hover:text-foreground",
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {sorted === "asc" ? (
                              <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                            ) : sorted === "desc" ? (
                              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
                            ) : header.column.getCanSort() ? (
                              <HugeiconsIcon icon={UnfoldMoreIcon} className="size-3.5 opacity-40" />
                            ) : null}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={keyExtractor ? keyExtractor(row.original) : row.id}
                    className="border-b transition-colors last:border-0 hover:bg-muted/40"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {renderCellValue(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No matching records found.
          </div>
        )}

        {table.getPageCount() > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) =>
                  setPagination({ ...pagination, pageSize: Number(e.target.value) })
                }
                className="rounded-lg border bg-background px-2 py-1 text-sm"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                aria-label="Previous page"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                aria-label="Next page"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
