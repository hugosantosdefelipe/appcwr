'use client';

import { useState } from 'react';
import {
  Sparkles,
  Download,
  Search,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Phase = 'menu' | 'publisher-input' | 'publisher-candidates' | 'done';

interface ExportRow {
  titulo: unknown;
  total_autores: unknown;
  concord_code: unknown;
}

export function ProjectsIaDialog() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('menu');
  const [publisherInput, setPublisherInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [exportedCount, setExportedCount] = useState(0);

  const reset = () => {
    setPhase('menu');
    setPublisherInput('');
    setError(null);
    setCandidates([]);
    setChosen(null);
    setExportedCount(0);
    setLoading(false);
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) reset();
  };

  const asString = (v: unknown): string =>
    v === null || v === undefined ? '' : String(v);

  const exportRowsToXlsx = (rows: ExportRow[], publisher: string) => {
    const xlsxRows = rows.map((r) => ({
      Title: asString(r.titulo),
      'Composers/Authors': asString(r.total_autores),
    }));
    const ws = XLSX.utils.json_to_sheet(xlsxRows, {
      header: ['Title', 'Composers/Authors'],
    });
    const colTitle = Math.min(
      60,
      Math.max(10, ...xlsxRows.map((r) => r.Title.length + 2))
    );
    const colAuthors = Math.min(
      80,
      Math.max(18, ...xlsxRows.map((r) => r['Composers/Authors'].length + 2))
    );
    ws['!cols'] = [{ wch: colTitle }, { wch: colAuthors }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Repertory');
    const safe = publisher.replace(/[\\/:*?"<>|]+/g, '-');
    const filename = `repertory-${safe}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const runSearch = async (name: string, exact: boolean) => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/obras/publisher-repertory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), exact }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Request failed');
      }

      if (!json.exported) {
        const list = (json.candidates as string[]) || [];
        if (list.length === 0) {
          setError(
            'No publishers found with a non-Z chain match. Try a different name.'
          );
          setCandidates([]);
          setPhase('publisher-input');
          return;
        }
        setCandidates(list);
        setPhase('publisher-candidates');
        return;
      }

      const rows = (json.rows as ExportRow[]) || [];
      if (rows.length === 0) {
        setError(
          `No works found for "${json.publisher}" outside chain Z.`
        );
        setPhase('publisher-input');
        return;
      }
      exportRowsToXlsx(rows, String(json.publisher));
      setChosen(String(json.publisher));
      setExportedCount(rows.length);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-primary/30 text-primary hover:bg-primary/10"
        >
          <Sparkles className="h-4 w-4" />
          Proyectos IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {phase === 'menu' && 'What action do you want…'}
            {phase === 'publisher-input' && 'Export Repertory'}
            {phase === 'publisher-candidates' && 'Pick the publisher'}
            {phase === 'done' && 'Export complete'}
          </DialogTitle>
          <DialogDescription>
            {phase === 'menu' &&
              'Pick an automated action to run against the catalog.'}
            {phase === 'publisher-input' &&
              'Type the publisher name. If there is no exact match, candidates will be shown for you to pick.'}
            {phase === 'publisher-candidates' &&
              'No exact match found. Choose the right publisher from the list below and the export will start.'}
            {phase === 'done' &&
              chosen &&
              `Downloaded ${exportedCount} work${exportedCount === 1 ? '' : 's'} for ${chosen}. Chain Z entries were excluded.`}
          </DialogDescription>
        </DialogHeader>

        {phase === 'menu' && (
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPhase('publisher-input');
              }}
              className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Download className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Export Repertory</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Excel with <span className="font-mono">Title</span> and{' '}
                  <span className="font-mono">Composers/Authors</span> for every
                  work in which a given publisher controls rights outside chain
                  Z.
                </div>
              </div>
            </button>
          </div>
        )}

        {phase === 'publisher-input' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Publisher name
              </label>
              <Input
                autoFocus
                placeholder="e.g. CONCORD SOUNDS"
                value={publisherInput}
                onChange={(e) => setPublisherInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSearch(publisherInput, false);
                }}
                className="mt-1.5 h-10"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setPhase('menu');
                }}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => runSearch(publisherInput, false)}
                disabled={loading || !publisherInput.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search & Export
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {phase === 'publisher-candidates' && (
          <div className="space-y-3">
            <div className="max-h-[50vh] overflow-auto rounded-md border border-border">
              {candidates.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={loading}
                  onClick={() => runSearch(c, true)}
                  className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-accent disabled:opacity-50"
                >
                  <span className="font-medium">{c}</span>
                  {loading && chosen !== c ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Download className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setPhase('publisher-input')}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-3">
            <Badge
              variant="outline"
              className="border-emerald-500/50 text-emerald-600"
            >
              <Check className="h-3.5 w-3.5" />
              Downloaded
            </Badge>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button onClick={reset}>Run another action</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
