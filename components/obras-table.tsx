'use client';

import useSWR from 'swr';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertCircle,
  Database,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  X,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDragScroll } from '@/hooks/use-drag-scroll';
import { Input } from '@/components/ui/input';
import { CopyrightChainsModal } from '@/components/copyright-chains-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Obra {
  [key: string]: unknown;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: Obra[];
  pagination?: Pagination;
  error?: string;
}

const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }
  return res.json();
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Desired column order and human-readable labels
const COLUMN_CONFIG: Record<string, string> = {
  concord_code: 'Concord Code',
  copyright_chains: 'Copyright',
  titulo: 'Title',
  total_autores: 'Composers/Authors',
  iswc: 'ISWC',
  interpretes: 'Performers',
  total_editores: 'Publishers',
  archivo_cwr: 'CWR File',
};

const COLUMN_ORDER = Object.keys(COLUMN_CONFIG);

// Reasonable widths per column (min..max). Cells truncate with ellipsis; double-click to expand.
const COLUMN_WIDTHS: Record<string, string> = {
  concord_code: 'min-w-[130px] max-w-[150px]',
  copyright_chains: 'min-w-[90px] max-w-[110px]',
  titulo: 'min-w-[220px] max-w-[320px]',
  total_autores: 'min-w-[200px] max-w-[280px]',
  iswc: 'min-w-[140px] max-w-[170px]',
  interpretes: 'min-w-[180px] max-w-[240px]',
  total_editores: 'min-w-[200px] max-w-[280px]',
  archivo_cwr: 'min-w-[160px] max-w-[220px]',
};

export function ObrasTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCell, setExpandedCell] = useState<{
    column: string;
    value: unknown;
    label: string;
    concordCode: string;
    title: string;
  } | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 400);
  const debouncedFilters = useDebounce(columnFilters, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedFilters]);

  const handleColumnFilter = useCallback((column: string, value: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (value) {
        next[column] = value;
      } else {
        delete next[column];
      }
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setSearchTerm('');
  }, []);

  const activeFilterCount = Object.keys(debouncedFilters).length + (debouncedSearch ? 1 : 0);
  const dragScrollRef = useDragScroll<HTMLDivElement>();
  const topScrollRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    }
    for (const [col, val] of Object.entries(debouncedFilters)) {
      if (val) {
        params.set(`filter[${col}]`, val);
      }
    }
    return `/api/obras?${params.toString()}`;
  }, [page, limit, debouncedSearch, debouncedFilters]);

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const handleRefresh = useCallback(() => {
    mutate();
  }, [mutate]);

  // Loading state
  if (isLoading && !data) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-muted-foreground text-sm">Loading records from database...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || (data && !data.success)) {
    return (
      <Card className="border-destructive/30 shadow-sm">
        <CardContent className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Failed to load data</p>
              <p className="text-sm text-muted-foreground mt-1.5">
                {data?.error || error?.message || 'Could not connect to the database'}
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh} className="mt-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const obras = data?.data || [];
  const pagination = data?.pagination;
  const dataColumns = obras.length > 0 ? Object.keys(obras[0]) : [];

  // Use ordered columns: known columns first in order, then any extra unknown columns
  const sortedColumns = [
    ...COLUMN_ORDER.filter(col => dataColumns.includes(col)),
    ...dataColumns.filter(col => !COLUMN_ORDER.includes(col)),
  ];

  const getColumnLabel = (col: string): string => COLUMN_CONFIG[col] || col;

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (value instanceof Date) return value.toLocaleDateString('en-US');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const fromRecord = pagination ? (page - 1) * limit + 1 : 0;
  const toRecord = pagination ? Math.min(page * limit, pagination.total) : obras.length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="shadow-sm">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: stats */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">
                  {pagination ? (
                    <>
                      <span className="text-foreground">{pagination.total.toLocaleString()}</span>
                      <span className="text-muted-foreground"> works</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{obras.length} works</span>
                  )}
                </span>
                {pagination && pagination.totalPages > 1 && (
                  <span className="text-xs text-muted-foreground">
                    · showing {fromRecord}–{toRecord}
                  </span>
                )}
              </div>
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-obras"
                  placeholder="Search by code or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-9 h-9 text-sm"
                  aria-label="Search works"
                />
              </div>

              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant={showFilters ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setShowFilters(f => !f)}
                  aria-label="Column filters"
                  className="relative rounded-none h-9 px-3 gap-1.5"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span className="text-xs">Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-bold ml-0.5">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    aria-label="Clear all filters"
                    className="rounded-none h-9 px-2 border-l text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                aria-label="Refresh data"
                className="h-9 w-9"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {obras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                <Database className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">
                {debouncedSearch || activeFilterCount > 0 ? 'No results found' : 'No records'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {debouncedSearch || activeFilterCount > 0
                  ? 'Try adjusting your search or filter criteria'
                  : 'The table is empty'}
              </p>
            </div>
          ) : (
            <>
              {/* Top scrollbar */}
              <div
                ref={topScrollRef}
                className="top-scrollbar overscroll-x-contain border-b"
              >
                <div className="top-scrollbar-inner">&nbsp;</div>
              </div>

              <div
                ref={(el) => {
                  // Assign to drag scroll ref
                  (dragScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                  // Setup sync between top scrollbar and table
                  if (!el || !topScrollRef.current) return;
                  const topBar = topScrollRef.current;
                  const inner = topBar.querySelector('.top-scrollbar-inner') as HTMLElement;
                  if (!inner) return;

                  // Match inner width to table scroll width
                  const syncWidth = () => {
                    if (el.scrollWidth > el.clientWidth) {
                      inner.style.width = `${el.scrollWidth}px`;
                      topBar.style.display = 'block';
                    } else {
                      topBar.style.display = 'none';
                    }
                  };
                  syncWidth();
                  const ro = new ResizeObserver(syncWidth);
                  ro.observe(el);

                  topBar.onscroll = () => {
                    if (syncing.current) return;
                    syncing.current = true;
                    el.scrollLeft = topBar.scrollLeft;
                    syncing.current = false;
                  };
                  el.onscroll = () => {
                    if (syncing.current) return;
                    syncing.current = true;
                    topBar.scrollLeft = el.scrollLeft;
                    syncing.current = false;
                  };
                }}
                className="overflow-auto overscroll-x-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      {sortedColumns.map((column) => (
                        <TableHead
                          key={column}
                          className={`text-xs font-semibold uppercase tracking-wider whitespace-nowrap h-10 ${
                            COLUMN_WIDTHS[column] || ''
                          } ${
                            column === 'concord_code'
                              ? 'sticky left-0 z-10 bg-muted/95 backdrop-blur-sm'
                              : ''
                          }`}
                        >
                          {getColumnLabel(column)}
                        </TableHead>
                      ))}
                    </TableRow>
                    {showFilters && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        {sortedColumns.map((column) => (
                          <TableHead
                            key={`filter-${column}`}
                            className={`py-1.5 px-2 ${COLUMN_WIDTHS[column] || ''} ${
                              column === 'concord_code'
                                ? 'sticky left-0 z-10 bg-muted/95 backdrop-blur-sm'
                                : ''
                            }`}
                          >
                            {column === 'copyright_chains' ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <Input
                                placeholder="Filter..."
                                value={columnFilters[column] || ''}
                                onChange={(e) => handleColumnFilter(column, e.target.value)}
                                className="h-7 text-xs min-w-[80px] bg-background"
                                aria-label={`Filter by ${getColumnLabel(column)}`}
                              />
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {obras.map((obra, index) => (
                      <TableRow
                        key={String(obra.concord_code || index)}
                        className={`transition-colors ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/15'
                        } hover:bg-accent/50`}
                      >
                        {sortedColumns.map((column) => {
                          const isChains = column === 'copyright_chains';
                          const cellValue = obra[column];
                          const rawText = formatCellValue(cellValue);
                          return (
                            <TableCell
                              key={column}
                              onDoubleClick={
                                isChains
                                  ? undefined
                                  : () =>
                                      setExpandedCell({
                                        column,
                                        value: cellValue,
                                        label: getColumnLabel(column),
                                        concordCode: String(obra.concord_code || ''),
                                        title: String(obra.titulo || ''),
                                      })
                              }
                              title={isChains ? undefined : `${rawText}\n\n(doble-click para expandir)`}
                              className={`text-sm ${COLUMN_WIDTHS[column] || ''} ${
                                isChains ? '' : 'truncate cursor-zoom-in select-none'
                              } ${
                                column === 'concord_code'
                                  ? 'font-mono font-semibold text-primary sticky left-0 z-10 bg-inherit'
                                  : ''
                              } ${column === 'iswc' ? 'font-mono text-muted-foreground' : ''} ${
                                column === 'archivo_cwr' ? 'font-mono text-xs text-muted-foreground' : ''
                              }`}
                            >
                              {isChains ? (
                                <CopyrightChainsModal
                                  data={obra[column]}
                                  concordCode={String(obra.concord_code || '')}
                                  title={String(obra.titulo || '')}
                                />
                              ) : (
                                rawText
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Rows per page</span>
                    <Select
                      value={String(limit)}
                      onValueChange={(val) => {
                        setLimit(Number(val));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[68px] h-8 text-xs" aria-label="Rows per page">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="hidden sm:inline text-xs">
                      · Page {pagination.page} of {pagination.totalPages}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(1)}
                      disabled={!pagination.hasPrev}
                      aria-label="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrev}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="px-3 text-sm font-medium tabular-nums">
                      {pagination.page}
                      <span className="text-muted-foreground mx-1">/</span>
                      {pagination.totalPages}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={!pagination.hasNext}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(pagination.totalPages)}
                      disabled={!pagination.hasNext}
                      aria-label="Last page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!expandedCell}
        onOpenChange={(open) => !open && setExpandedCell(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {expandedCell?.label}
              {expandedCell?.title ? (
                <Badge variant="outline" className="font-normal">
                  {expandedCell.title}
                </Badge>
              ) : null}
            </DialogTitle>
            {expandedCell?.concordCode ? (
              <DialogDescription className="font-mono text-xs">
                {expandedCell.concordCode}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap break-words">
            {expandedCell ? formatCellValue(expandedCell.value) || '—' : ''}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
