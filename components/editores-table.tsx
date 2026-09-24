'use client';

import useSWR from 'swr';
import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  DownloadCloud,
  Loader2,
} from 'lucide-react';

const ESTADOS = ['No pedido', 'Pedido sin numero', 'Con numero', 'Renunciado'] as const;
type Estado = (typeof ESTADOS)[number];

// Etiqueta con acentos para mostrar; el valor guardado va sin acentos (ENUM de la BD)
const ESTADO_LABELS: Record<Estado, string> = {
  'No pedido': 'No pedido',
  'Pedido sin numero': 'Pedido sin número',
  'Con numero': 'Con número',
  Renunciado: 'Renunciado',
};

// Color por estado, para leer la tabla de un vistazo
const ESTADO_STYLES: Record<Estado, string> = {
  'No pedido': 'text-muted-foreground',
  'Pedido sin numero': 'text-amber-600 dark:text-amber-400',
  'Con numero': 'text-emerald-600 dark:text-emerald-400',
  Renunciado: 'text-rose-600 dark:text-rose-400',
};

interface EditorRow {
  editor: string;
  obras: number;
  estado: Estado;
  numero_catalogo: string | null;
  fecha_peticion: string | null;
  notas: string | null;
}

interface Stats {
  [estado: string]: { editores: number; obras: number };
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
  data?: EditorRow[];
  stats?: Stats;
  pagination?: Pagination;
  error?: string;
}

const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Campo de texto que solo guarda al salir del campo o con Enter, no en cada tecla. */
function EditableCell({
  value,
  placeholder,
  type = 'text',
  className = '',
  onSave,
}: {
  value: string | null;
  placeholder?: string;
  type?: string;
  className?: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value ?? '');
  const committed = useRef(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
    committed.current = value ?? '';
  }, [value]);

  const commit = () => {
    if (draft !== committed.current) {
      committed.current = draft;
      onSave(draft);
    }
  };

  return (
    <Input
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(committed.current);
          e.currentTarget.blur();
        }
      }}
      className={`h-8 ${className}`}
    />
  );
}

export function EditoresTable() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const [searchInput, setSearchInput] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [savedEditor, setSavedEditor] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const search = useDebounce(searchInput, 400);

  // Al cambiar los filtros volvemos a la primera pagina
  useEffect(() => {
    setPage(1);
  }, [search, estadoFilter]);

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  if (estadoFilter !== 'all') params.set('estado', estadoFilter);

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    `/api/editores?${params.toString()}`,
    fetcher,
    { keepPreviousData: true }
  );

  const updateEditor = useCallback(
    async (editor: string, patch: Partial<Record<string, string>>) => {
      setSaveError(null);
      try {
        // Optimista: pintamos el cambio antes de que conteste el servidor
        await mutate(
          async (current) => {
            const res = await fetch('/api/editores', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ editor, ...patch }),
            });
            const json: ApiResponse = await res.json();
            if (!res.ok || !json.success) {
              throw new Error(json.error || 'Error al guardar');
            }
            return current;
          },
          {
            optimisticData: (current) =>
              current && current.data
                ? {
                    ...current,
                    data: current.data.map((row) =>
                      row.editor === editor
                        ? { ...row, ...(patch as Partial<EditorRow>) }
                        : row
                    ),
                  }
                : (current as ApiResponse),
            rollbackOnError: true,
            revalidate: true,
          }
        );

        setSavedEditor(editor);
        setTimeout(() => setSavedEditor((e) => (e === editor ? null : e)), 1500);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Error al guardar');
      }
    },
    [mutate]
  );

  /** Recalcula la lista de editores a partir de las obras de cwr_obras. */
  const refreshList = useCallback(async () => {
    setRefreshing(true);
    setSaveError(null);
    setRefreshMsg(null);
    try {
      const res = await fetch('/api/editores', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al actualizar la lista');
      }
      setRefreshMsg(
        json.nuevos > 0
          ? `${json.nuevos} editores nuevos (${json.total} en total)`
          : `Lista al día (${json.total} editores)`
      );
      setTimeout(() => setRefreshMsg(null), 4000);
      await mutate();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al actualizar la lista');
    } finally {
      setRefreshing(false);
    }
  }, [mutate]);

  const stats = data?.stats;
  const pagination = data?.pagination;
  const editores = data?.data ?? [];
  const hasFilters = searchInput !== '' || estadoFilter !== 'all';

  if (error || (data && !data.success)) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Error al cargar los editores</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {data?.error || 'No se pudo conectar con la base de datos'}
            </p>
          </div>
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contadores por estado; al pulsar uno se filtra por el */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ESTADOS.map((e) => {
          const s = stats?.[e];
          const active = estadoFilter === e;
          return (
            <button
              key={e}
              type="button"
              onClick={() => setEstadoFilter(active ? 'all' : e)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {ESTADO_LABELS[e]}
              </p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${ESTADO_STYLES[e]}`}>
                {s ? s.editores.toLocaleString('es-ES') : '—'}
              </p>
              <p className="text-muted-foreground text-xs">
                {s ? `${s.obras.toLocaleString('es-ES')} obras` : ''}
              </p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Barra de filtros */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Buscar editor, nº de catálogo o notas..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_LABELS[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput('');
                  setEstadoFilter('all');
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Limpiar
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => mutate()}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={refreshList} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DownloadCloud className="mr-2 h-4 w-4" />
              )}
              Actualizar lista
            </Button>
          </div>

          {refreshMsg && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/50 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />
              {refreshMsg}
            </div>
          )}

          {saveError && (
            <div className="border-destructive/50 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {saveError}
            </div>
          )}

          {isLoading && !data ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <Spinner className="h-8 w-8" />
              <p className="text-muted-foreground">Cargando editores...</p>
            </div>
          ) : editores.length === 0 ? (
            <div className="text-muted-foreground py-16 text-center">
              No hay editores que coincidan con el filtro
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">EDITOR</TableHead>
                    <TableHead className="text-right font-semibold">OBRAS</TableHead>
                    <TableHead className="font-semibold">ESTADO</TableHead>
                    <TableHead className="font-semibold">Nº CATÁLOGO</TableHead>
                    <TableHead className="font-semibold">FECHA PETICIÓN</TableHead>
                    <TableHead className="font-semibold">NOTAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editores.map((row) => (
                    <TableRow key={row.editor} className="hover:bg-muted/30">
                      <TableCell className="max-w-[320px] font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate" title={row.editor}>
                            {row.editor}
                          </span>
                          {savedEditor === row.editor && (
                            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.obras.toLocaleString('es-ES')}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.estado}
                          onValueChange={(v) => updateEditor(row.editor, { estado: v })}
                        >
                          <SelectTrigger className={`h-8 w-[180px] ${ESTADO_STYLES[row.estado]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS.map((e) => (
                              <SelectItem key={e} value={e}>
                                {ESTADO_LABELS[e]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={row.numero_catalogo}
                          placeholder="—"
                          className="w-[150px]"
                          onSave={(v) => updateEditor(row.editor, { numero_catalogo: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={row.fecha_peticion}
                          type="date"
                          className="w-[150px]"
                          onSave={(v) => updateEditor(row.editor, { fecha_peticion: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={row.notas}
                          placeholder="—"
                          className="w-[260px]"
                          onSave={(v) => updateEditor(row.editor, { notas: v })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginacion */}
          {pagination && pagination.total > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-sm">
                {((pagination.page - 1) * pagination.limit + 1).toLocaleString('es-ES')}
                {'–'}
                {Math.min(pagination.page * pagination.limit, pagination.total).toLocaleString(
                  'es-ES'
                )}
                {' de '}
                {pagination.total.toLocaleString('es-ES')} editores
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage(1)}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm tabular-nums">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage(pagination.totalPages)}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
