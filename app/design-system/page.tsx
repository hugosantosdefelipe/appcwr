import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  Braces,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Database,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Music,
  RefreshCw,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Design System — Works Registry',
  description:
    'Foundations, components and rules for the Proyectos de Autor Works Registry UI',
};

type SwatchProps = {
  value: string;
  name: string;
  note?: string;
  bordered?: boolean;
};

function Swatch({ value, name, note, bordered = true }: SwatchProps) {
  return (
    <div className="flex flex-col">
      <div
        className={`h-14 w-full rounded-lg ${bordered ? 'border border-border' : ''}`}
        style={{ background: value }}
      />
      <div className="mt-2 text-xs font-semibold">{name}</div>
      {note && <div className="mt-0.5 font-mono text-[10px] text-muted-foreground leading-tight">{note}</div>}
    </div>
  );
}

type SectionProps = {
  id: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
};

function Section({ id, title, lede, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          §
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {lede && <p className="mt-1 text-sm text-muted-foreground">{lede}</p>}
      </div>
      {children}
    </section>
  );
}

function Panel({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardContent>
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function DesignSystemPage() {
  const toc = [
    { id: 'brand', label: 'Brand' },
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'shape', label: 'Shape & space' },
    { id: 'icons', label: 'Iconography' },
    { id: 'components', label: 'Components' },
    { id: 'states', label: 'States' },
    { id: 'rules', label: 'Rules' },
  ];

  const neutrals = [
    { value: 'oklch(0.985 0.002 247)', name: 'Background', note: '0.985 · 247' },
    { value: 'oklch(1 0 0)', name: 'Card', note: '1.000' },
    { value: 'oklch(0.965 0.005 260)', name: 'Secondary', note: '0.965 · 260' },
    { value: 'oklch(0.96 0.005 260)', name: 'Muted', note: '0.96 · 260' },
    { value: 'oklch(0.91 0.008 260)', name: 'Border', note: '0.91 · 260' },
    { value: 'oklch(0.50 0.015 260)', name: 'Muted FG', note: '0.50 · 260' },
    { value: 'oklch(0.25 0.02 260)', name: 'Secondary FG', note: '0.25 · 260' },
    { value: 'oklch(0.15 0.015 260)', name: 'Foreground', note: '0.15 · 260' },
    { value: 'oklch(0.13 0.015 260)', name: 'BG (dark)', note: '0.13 · 260' },
    { value: 'oklch(0.17 0.015 260)', name: 'Card (dark)', note: '0.17 · 260' },
    { value: 'oklch(0.22 0.015 260)', name: 'Muted (dark)', note: '0.22 · 260' },
    { value: 'oklch(0.25 0.015 260)', name: 'Border (dark)', note: '0.25 · 260' },
  ];

  const primaries = [
    { value: 'oklch(0.45 0.18 264)', name: 'Primary', note: '0.45 0.18 264' },
    { value: 'oklch(0.65 0.20 264)', name: 'Primary (dark)', note: '0.65 0.20 264' },
    { value: 'oklch(0.955 0.012 264)', name: 'Accent', note: '0.955 0.012 264' },
    { value: 'oklch(0.35 0.10 264)', name: 'Accent FG', note: '0.35 0.10 264' },
    { value: 'oklch(0.985 0.002 247)', name: 'Primary FG', note: '0.985 0.002 247' },
  ];

  const charts = [
    { value: 'oklch(0.45 0.18 264)', name: 'chart-1', note: 'indigo · 264' },
    { value: 'oklch(0.6 0.15 170)', name: 'chart-2', note: 'teal · 170' },
    { value: 'oklch(0.55 0.12 300)', name: 'chart-3', note: 'violet · 300' },
    { value: 'oklch(0.75 0.15 80)', name: 'chart-4', note: 'amber · 80' },
    { value: 'oklch(0.65 0.20 25)', name: 'chart-5', note: 'coral · 25' },
  ];

  const radii = [
    { px: 4, label: 'sm', use: 'badges' },
    { px: 6, label: 'md', use: 'buttons · inputs' },
    { px: 8, label: 'lg', use: 'dialogs · stat chips' },
    { px: 12, label: 'xl', use: 'cards' },
    { px: 16, label: '2xl', use: 'logo mark' },
  ];

  const spaces = [
    { px: 4, token: '1' },
    { px: 8, token: '2' },
    { px: 12, token: '3' },
    { px: 16, token: '4' },
    { px: 24, token: '6' },
    { px: 32, token: '8' },
    { px: 48, token: '12' },
    { px: 64, token: '16' },
  ];

  const iconInventory: { icon: React.ElementType; name: string }[] = [
    { icon: Music, name: 'music' },
    { icon: FileText, name: 'file-text' },
    { icon: Braces, name: 'braces' },
    { icon: Search, name: 'search' },
    { icon: Filter, name: 'filter' },
    { icon: X, name: 'x' },
    { icon: RefreshCw, name: 'refresh-cw' },
    { icon: Database, name: 'database' },
    { icon: Copy, name: 'copy' },
    { icon: Check, name: 'check' },
    { icon: AlertCircle, name: 'alert-circle' },
    { icon: AlertTriangle, name: 'alert-triangle' },
    { icon: Lock, name: 'lock' },
    { icon: Eye, name: 'eye' },
    { icon: EyeOff, name: 'eye-off' },
    { icon: LogOut, name: 'log-out' },
    { icon: Sun, name: 'sun' },
    { icon: Moon, name: 'moon' },
    { icon: ChevronLeft, name: 'chevron-left' },
    { icon: ChevronRight, name: 'chevron-right' },
    { icon: ChevronsLeft, name: 'chevrons-left' },
    { icon: ChevronsRight, name: 'chevrons-right' },
    { icon: ChevronDown, name: 'chevron-down' },
    { icon: Loader2, name: 'loader-2' },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Design System</h1>
              <p className="text-sm text-muted-foreground">
                Works Registry — foundations, components & rules
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                ← Back to app
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
          {/* TOC */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Contents
              </div>
              <nav className="flex flex-col gap-1">
                {toc.map((t) => (
                  <a
                    key={t.id}
                    href={`#${t.id}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-12">
            {/* BRAND */}
            <Section
              id="brand"
              title="Brand"
              lede="One wordmark, one Music icon chip, two brand marks (light/dark inversion)."
            >
              <Panel label="Wordmark">
                <div className="flex flex-wrap items-end gap-10">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                      <Music className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-semibold tracking-tight leading-tight">
                        Works Registry
                      </div>
                      <div className="text-sm text-muted-foreground">
                        CWR Management System
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                      <Music className="h-7 w-7" />
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      login variant · h-14 · rounded-2xl · shadow-lg
                    </div>
                  </div>
                </div>
              </Panel>
            </Section>

            {/* COLORS */}
            <Section
              id="colors"
              title="Colors"
              lede="OKLCH throughout. Indigo-blue primary (~264°), cool-tinted neutrals (~260°)."
            >
              <Panel label="Primary">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {primaries.map((s) => (
                    <Swatch key={s.name} {...s} />
                  ))}
                </div>
              </Panel>

              <Panel label="Neutrals (light & dark)">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {neutrals.map((s) => (
                    <Swatch key={s.name} {...s} />
                  ))}
                </div>
              </Panel>

              <Panel label="Semantic">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="flex flex-col">
                    <div className="flex h-14 items-center justify-center gap-2 rounded-lg text-xs font-semibold"
                         style={{ background: 'oklch(0.577 0.245 27.325 / 0.1)', color: 'oklch(0.577 0.245 27.325)' }}>
                      <AlertCircle className="h-3.5 w-3.5" /> Failed to load
                    </div>
                    <div className="mt-2 text-xs font-semibold">Destructive</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">0.577 0.245 27</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex h-14 items-center justify-center gap-2 rounded-lg text-xs font-semibold"
                         style={{ background: 'color-mix(in oklch, oklch(0.75 0.15 80) 15%, white)', color: 'oklch(0.55 0.15 80)' }}>
                      <AlertTriangle className="h-3.5 w-3.5" /> Parse error
                    </div>
                    <div className="mt-2 text-xs font-semibold">Warning (amber)</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">0.75 0.15 80</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex h-14 items-center justify-center gap-2 rounded-lg text-xs font-semibold text-white"
                         style={{ background: 'oklch(0.60 0.15 150)' }}>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </div>
                    <div className="mt-2 text-xs font-semibold">Success (emerald)</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">0.60 0.15 150</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex h-14 items-center justify-center gap-2 rounded-lg text-xs font-semibold text-primary bg-primary/10">
                      <FileText className="h-3.5 w-3.5" /> Info
                    </div>
                    <div className="mt-2 text-xs font-semibold">Info (primary)</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">0.45 0.18 264</div>
                  </div>
                </div>
              </Panel>

              <Panel label="Charts — 5-color ramp, similar perceptual lightness">
                <div className="grid grid-cols-5 gap-3">
                  {charts.map((s) => (
                    <Swatch key={s.name} {...s} />
                  ))}
                </div>
              </Panel>
            </Section>

            {/* TYPOGRAPHY */}
            <Section
              id="typography"
              title="Typography"
              lede="Geist Sans for everything; Geist Mono structurally for codes, ISWCs, percentages."
            >
              <Panel label="Families & weights">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Geist Sans
                    </div>
                    <div className="space-y-1.5 text-lg">
                      <div className="font-normal">Proyectos de Autor <span className="ml-auto font-mono text-[11px] text-muted-foreground">400</span></div>
                      <div className="font-medium">Proyectos de Autor <span className="ml-auto font-mono text-[11px] text-muted-foreground">500</span></div>
                      <div className="font-semibold">Proyectos de Autor <span className="ml-auto font-mono text-[11px] text-muted-foreground">600</span></div>
                      <div className="font-bold">Proyectos de Autor <span className="ml-auto font-mono text-[11px] text-muted-foreground">700</span></div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Geist Mono
                    </div>
                    <div className="space-y-1.5 text-lg font-mono">
                      <div className="font-normal">T-0123456789.01 <span className="ml-auto text-[11px] text-muted-foreground">400</span></div>
                      <div className="font-medium">T-0123456789.01 <span className="ml-auto text-[11px] text-muted-foreground">500</span></div>
                      <div className="font-semibold">T-0123456789.01 <span className="ml-auto text-[11px] text-muted-foreground">600</span></div>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel label="Scale">
                <div className="space-y-3">
                  <div className="flex items-baseline gap-4">
                    <span className="w-24 font-mono text-[11px] text-muted-foreground">H1 · 24/600</span>
                    <span className="text-2xl font-semibold tracking-tight">Works Registry</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-24 font-mono text-[11px] text-muted-foreground">H2 · 20/600</span>
                    <span className="text-xl font-semibold tracking-tight">Authentication</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-24 font-mono text-[11px] text-muted-foreground">H3 · 18/600</span>
                    <span className="text-lg font-semibold">Copyright Chains</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-24 font-mono text-[11px] text-muted-foreground">Body · 14/400</span>
                    <span className="text-sm">Search by code or title across the CWR registry.</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-24 font-mono text-[11px] text-muted-foreground">Small · 12/400</span>
                    <span className="text-xs text-muted-foreground">Protected access · Unauthorized use prohibited</span>
                  </div>
                </div>
              </Panel>

              <Panel label="Monospace is structural — codes, ISWCs, percentages">
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider">
                        <th className="px-3 py-2">Concord Code</th>
                        <th className="px-3 py-2">Title</th>
                        <th className="px-3 py-2 text-right">PR %</th>
                        <th className="px-3 py-2">ISWC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="px-3 py-2 font-mono font-semibold text-primary">CNCD-4421</td>
                        <td className="px-3 py-2">La Luz Que No Vi</td>
                        <td className="px-3 py-2 text-right font-mono">33.33%</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground text-xs">T-123.456.789-0</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono font-semibold text-primary">CNCD-4422</td>
                        <td className="px-3 py-2">Tarde de Invierno</td>
                        <td className="px-3 py-2 text-right font-mono">16.67%</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground text-xs">T-123.456.790-3</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Panel>
            </Section>

            {/* SHAPE & SPACE */}
            <Section
              id="shape"
              title="Shape & space"
              lede="8px base radius ramp. Almost no shadow. Nothing glows."
            >
              <Panel label="Radii">
                <div className="flex flex-wrap items-end gap-5">
                  {radii.map((r) => (
                    <div key={r.label} className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-16 bg-primary/15 border border-primary/30"
                        style={{ height: r.px, borderRadius: r.px }}
                      />
                      <div className="text-[11px] font-semibold">{r.label}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.px}px</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.use}</div>
                    </div>
                  ))}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30" />
                    <div className="text-[11px] font-semibold">full</div>
                    <div className="font-mono text-[10px] text-muted-foreground">9999px</div>
                    <div className="font-mono text-[10px] text-muted-foreground">chips</div>
                  </div>
                </div>
              </Panel>

              <Panel label="Shadows">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div>
                    <div className="flex h-20 items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground">
                      no shadow
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-muted-foreground text-center">none</div>
                  </div>
                  <div>
                    <div className="flex h-20 items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground"
                         style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      inputs · buttons
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-muted-foreground text-center">shadow-xs</div>
                  </div>
                  <div>
                    <div className="flex h-20 items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground"
                         style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)' }}>
                      default cards
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-muted-foreground text-center">shadow-sm</div>
                  </div>
                  <div>
                    <div className="flex h-20 items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground"
                         style={{ boxShadow: '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.08)' }}>
                      login card only
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-muted-foreground text-center">shadow-lg</div>
                  </div>
                </div>
              </Panel>

              <Panel label="Spacing — 4px base">
                <div className="flex items-end gap-3">
                  {spaces.map((s) => (
                    <div key={s.token} className="flex flex-col items-center gap-1.5">
                      <div className="w-5 rounded-sm bg-primary/20" style={{ height: s.px }} />
                      <div className="font-mono text-[10px] font-semibold">{s.px}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{s.token}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Page <span className="font-mono">px-6 py-8</span> · card <span className="font-mono">py-6</span> · stacks <span className="font-mono">space-y-4</span>.
                </p>
              </Panel>
            </Section>

            {/* ICONOGRAPHY */}
            <Section
              id="icons"
              title="Iconography"
              lede="lucide-react only. Stroke 1.5 (default). Sizes: h-3.5 / h-4 / h-5 / h-7. Never hand-authored. No emoji."
            >
              <Panel label="Complete in-product inventory">
                <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8">
                  {iconInventory.map(({ icon: Icon, name }) => (
                    <div key={name} className="flex flex-col items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-[18px] w-[18px] text-foreground" strokeWidth={1.5} />
                      <span className="font-mono text-[9.5px]">{name}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </Section>

            {/* COMPONENTS */}
            <Section
              id="components"
              title="Components"
              lede="Every built-in variant in one place."
            >
              <Panel label="Buttons · default · outline · ghost · destructive · icon variants">
                <div className="flex flex-wrap items-center gap-3">
                  <Button>
                    <RefreshCw className="h-4 w-4" /> Retry
                  </Button>
                  <Button variant="outline">
                    <Filter className="h-4 w-4" /> Filters
                  </Button>
                  <Button variant="ghost">
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                  <Button variant="destructive">
                    <X className="h-4 w-4" /> Delete
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Theme">
                    <Sun className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button size="sm">Small</Button>
                  <Button variant="outline" size="sm">Small outline</Button>
                  <Button disabled>Disabled</Button>
                </div>
                <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                  h-9 (default) · h-8 (sm) · rounded-md · 14/500 · transition-all
                </p>
              </Panel>

              <Panel label="Badges & chain button">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>Publisher</Badge>
                  <Badge variant="secondary">2</Badge>
                  <Badge variant="outline">Writer</Badge>
                  <Badge variant="outline">CA</Badge>
                  <Badge variant="destructive">Error</Badge>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2.5 text-xs font-medium hover:bg-primary/10 hover:border-primary/30"
                  >
                    <Braces className="h-3.5 w-3.5 text-primary" />
                    <span className="text-primary">2</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2.5 text-xs font-medium hover:bg-primary/10 hover:border-primary/30"
                  >
                    <Braces className="h-3.5 w-3.5 text-primary" />
                    <span className="text-primary">5</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-amber-600">Error</span>
                  </Button>
                </div>
              </Panel>

              <Panel label="Inputs — default · filter · password">
                <div className="max-w-md space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search by code or title..." className="pl-9 h-9" />
                  </div>
                  <Input placeholder="Filter..." className="h-7 text-xs" />
                  <Input type="password" placeholder="Password" defaultValue="●●●●●●●●" className="h-11" />
                </div>
                <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                  default h-9 · filter h-7 · login h-11 · focus ring 3px primary/50
                </p>
              </Panel>

              <Panel label="Stat card">
                <div className="max-w-md">
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex items-baseline gap-2 text-sm font-medium">
                          <span>23,481</span>
                          <span className="text-muted-foreground">works</span>
                          <span className="text-xs text-muted-foreground">· showing 1–50</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Panel>
            </Section>

            {/* STATES */}
            <Section
              id="states"
              title="States"
              lede="Empty, error, loading — three reliable patterns, one voice."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent>
                    <div className="flex flex-col items-center gap-2.5 py-6 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                        <Database className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-semibold">No results found</div>
                      <div className="text-xs text-muted-foreground">
                        Try adjusting your search or filter criteria
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-destructive/30">
                  <CardContent>
                    <div className="flex flex-col items-center gap-2.5 py-6 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="text-sm font-semibold">Failed to load data</div>
                      <div className="text-xs text-muted-foreground">
                        Could not connect to the database
                      </div>
                      <Button variant="outline" size="sm" className="mt-2">
                        <RefreshCw className="h-4 w-4" /> Retry
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="flex flex-col items-center gap-2.5 py-6 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        Loading records from database...
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Section>

            {/* RULES */}
            <Section
              id="rules"
              title="Rules"
              lede="The short version of the voice and do/don't guide."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Panel label="Do">
                  <ul className="space-y-2 text-sm leading-relaxed">
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      Title Case buttons (<span className="font-mono text-xs">"Sign In"</span>), sentence case descriptions.
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      Monospace for codes, ISWCs, percentages, chain IDs.
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      UPPERCASE + <span className="font-mono text-xs">tracking-wider</span> for column headers only.
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <span className="font-mono text-xs">...</span> at the end of placeholders. <span className="font-mono text-xs">—</span> for nulls. <span className="font-mono text-xs">·</span> as soft separator.
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      Cards <span className="font-mono text-xs">rounded-xl border shadow-sm</span>.
                    </li>
                  </ul>
                </Panel>
                <Panel label="Don't">
                  <ul className="space-y-2 text-sm leading-relaxed">
                    <li className="flex gap-2">
                      <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                      No gradients, textures, decorative imagery, or emoji — ever.
                    </li>
                    <li className="flex gap-2">
                      <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                      No hand-authored icons. Lucide only (except the single PA brand mark SVG).
                    </li>
                    <li className="flex gap-2">
                      <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                      No inner shadows, colored glows, or bounce animations.
                    </li>
                    <li className="flex gap-2">
                      <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                      Don't force the UI monolingual — data field names stay Spanish.
                    </li>
                    <li className="flex gap-2">
                      <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                      Don't introduce a second primary color. Red and amber only for real error/warning moments.
                    </li>
                  </ul>
                </Panel>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}
