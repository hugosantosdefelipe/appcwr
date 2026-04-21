'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Braces, AlertTriangle, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMemo, useState } from 'react';
import { useDragScroll } from '@/hooks/use-drag-scroll';

interface Writer {
  name?: string;
  role?: string;
  pr?: number;
  mr?: number;
}

interface Publisher {
  name?: string;
  type?: string;
  pr?: number;
  mr?: number;
}

interface ChainGroup {
  id?: string;
  publisher?: Publisher;
  publishers?: Publisher[];
  writers?: Writer[];
}

interface FlatRow {
  name: string;
  type: 'Publisher' | 'Writer';
  role: string;
  chain: string;
  pr: number | null;
  mr: number | null;
}

interface CopyrightChainsModalProps {
  data: unknown;
  concordCode: string;
  title?: string;
}

function parseChainData(data: unknown): { rows: FlatRow[]; rawChains: ChainGroup[]; error: string | null } {
  if (!data) return { rows: [], rawChains: [], error: null };

  try {
    let parsed = data;

    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
    }

    let chains: ChainGroup[] = [];

    if (Array.isArray(parsed)) {
      chains = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      for (const key of Object.keys(parsed as Record<string, unknown>)) {
        if (Array.isArray((parsed as Record<string, unknown>)[key])) {
          chains = (parsed as Record<string, unknown>)[key] as ChainGroup[];
          break;
        }
      }
      if (chains.length === 0) {
        chains = [parsed as ChainGroup];
      }
    }

    if (chains.length === 0) {
      return { rows: [], rawChains: [], error: null };
    }

    const rows: FlatRow[] = [];

    for (const chain of chains) {
      const chainId = chain.id || '-';

      // publisher singular (chain A, B, etc.)
      if (chain.publisher) {
        rows.push({
          name: chain.publisher.name || '-',
          type: 'Publisher',
          role: chain.publisher.type || '-',
          chain: chainId,
          pr: chain.publisher.pr ?? null,
          mr: chain.publisher.mr ?? null,
        });
      }

      // publishers plural (chain Z, etc.)
      if (chain.publishers && Array.isArray(chain.publishers)) {
        for (const pub of chain.publishers) {
          rows.push({
            name: pub.name || '-',
            type: 'Publisher',
            role: pub.type || '-',
            chain: chainId,
            pr: pub.pr ?? null,
            mr: pub.mr ?? null,
          });
        }
      }

      if (chain.writers && Array.isArray(chain.writers)) {
        for (const writer of chain.writers) {
          rows.push({
            name: writer.name || '-',
            type: 'Writer',
            role: writer.role || '-',
            chain: chainId,
            pr: writer.pr ?? null,
            mr: writer.mr ?? null,
          });
        }
      }
    }

    return { rows, rawChains: chains, error: null };
  } catch {
    return { rows: [], rawChains: [], error: 'Failed to parse copyright data' };
  }
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}%`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildClipboardPayload(
  rows: FlatRow[],
  context: { concordCode: string; title?: string }
): { html: string; text: string } {
  const header = ['Name', 'Type', 'Role', 'Chain', 'PR %', 'MR %'];
  const body = rows.map((r) => [
    r.name,
    r.type,
    r.role,
    r.chain,
    formatPercent(r.pr),
    formatPercent(r.mr),
  ]);

  const contextLine = `Copyright Chains — ${context.title || ''}${
    context.title && context.concordCode ? ' · ' : ''
  }${context.concordCode}`.trim();

  const text = [contextLine, '', header.join('\t'), ...body.map((r) => r.join('\t'))].join('\n');

  const tdStyle = 'padding:6px 10px;border:1px solid #d0d7de;font-family:Arial,Helvetica,sans-serif;font-size:13px;';
  const thStyle = `${tdStyle}background:#f6f8fa;font-weight:600;`;
  const htmlRows = body
    .map(
      (r) => `
      <tr>
        <td style="${tdStyle}">${escapeHtml(r[0])}</td>
        <td style="${tdStyle}text-align:center;">${escapeHtml(r[1])}</td>
        <td style="${tdStyle}text-align:center;">${escapeHtml(r[2])}</td>
        <td style="${tdStyle}text-align:center;font-family:Consolas,monospace;">${escapeHtml(r[3])}</td>
        <td style="${tdStyle}text-align:right;font-family:Consolas,monospace;">${escapeHtml(r[4])}</td>
        <td style="${tdStyle}text-align:right;font-family:Consolas,monospace;">${escapeHtml(r[5])}</td>
      </tr>`
    )
    .join('');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;">
      <p style="margin:0 0 8px 0;"><strong>${escapeHtml(contextLine)}</strong></p>
      <table style="border-collapse:collapse;border:1px solid #d0d7de;">
        <thead>
          <tr>
            <th style="${thStyle}text-align:left;">Name</th>
            <th style="${thStyle}text-align:center;">Type</th>
            <th style="${thStyle}text-align:center;">Role</th>
            <th style="${thStyle}text-align:center;">Chain</th>
            <th style="${thStyle}text-align:right;">PR %</th>
            <th style="${thStyle}text-align:right;">MR %</th>
          </tr>
        </thead>
        <tbody>${htmlRows}</tbody>
      </table>
    </div>
  `.trim();

  return { html, text };
}

async function copyRichToClipboard(html: string, text: string): Promise<void> {
  if (typeof window === 'undefined') return;
  // Modern path: ClipboardItem with both HTML and plain fallback.
  if (
    typeof window.ClipboardItem !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function'
  ) {
    const blobHtml = new Blob([html], { type: 'text/html' });
    const blobText = new Blob([text], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText }),
    ]);
    return;
  }
  // Fallback: plain text.
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Legacy execCommand fallback.
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export function CopyrightChainsModal({ data, concordCode, title }: CopyrightChainsModalProps) {
  const { rows, rawChains, error } = useMemo(() => parseChainData(data), [data]);
  const dragScrollRef = useDragScroll<HTMLDivElement>();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    try {
      const { html, text } = buildClipboardPayload(rows, { concordCode, title });
      await copyRichToClipboard(html, text);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (e) {
      console.error('Copy failed', e);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2500);
    }
  };

  if (rows.length === 0 && !error) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs font-medium hover:bg-primary/10 hover:border-primary/30 transition-colors"
          aria-label={`View copyright chains for ${concordCode}`}
        >
          {error ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-600">Error</span>
            </>
          ) : (
            <>
              <Braces className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary">{rawChains.length}</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-[95vw] w-full max-h-[90vh] overflow-auto sm:!max-w-[95vw]">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <DialogTitle className="flex items-center gap-2">
                Copyright Chains
                <Badge variant="outline" className="font-normal">
                  {title || concordCode}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {rows.length} participants across {rawChains.length} chain
                {rawChains.length !== 1 ? 's' : ''}
              </DialogDescription>
            </div>
            {rows.length > 0 && !error && (
              <Button
                type="button"
                size="sm"
                variant={copyState === 'copied' ? 'default' : 'outline'}
                onClick={handleCopy}
                className={
                  copyState === 'copied'
                    ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                    : ''
                }
                aria-label="Copy copyright info for email"
              >
                {copyState === 'copied' ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Copied
                  </>
                ) : copyState === 'error' ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-500" />
                    Failed
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy for email
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div ref={dragScrollRef} className="rounded-md border overflow-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Table className="w-full table-fixed min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold w-[35%]">Name</TableHead>
                  <TableHead className="font-semibold text-center w-[12%]">Type</TableHead>
                  <TableHead className="font-semibold text-center w-[10%]">Role</TableHead>
                  <TableHead className="font-semibold text-center w-[10%]">Chain</TableHead>
                  <TableHead className="font-semibold text-right w-[13%]">PR %</TableHead>
                  <TableHead className="font-semibold text-right w-[13%]">MR %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={index} className="hover:bg-muted/30">
                    <TableCell className="font-medium break-words">{row.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={row.type === 'Publisher' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {row.type === 'Publisher' ? 'Publisher' : 'Writer'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{row.role}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {row.chain}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPercent(row.pr)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPercent(row.mr)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
