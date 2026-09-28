import {
  CheckCircle2,
  Clock,
  Download,
  FileStack,
  FileText,
  GitCompare,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { adminApi } from '../../services/admin'
import type { AdminAnalytics } from '../../types/admin'

/* -------------------------------------------------------------------------- */
/*  Constants & helpers                                                       */
/* -------------------------------------------------------------------------- */

const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3']

const PRIORITY_DOT: Record<string, string> = {
  P0: 'var(--p0-dot)',
  P1: 'var(--p1-dot)',
  P2: 'var(--p2-dot)',
  P3: 'var(--p3-dot)',
}

const PRIORITY_LABEL: Record<string, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
}

const AXIS_TICK = { fontSize: 11, fill: 'var(--text-muted)' }
const CURSOR_STYLE = { fill: 'var(--border)', opacity: 0.35 }

type ChartRow = { name: string; value: number }

function toChartData(record: Record<string, number>, sort = true): ChartRow[] {
  const rows = Object.entries(record).map(([name, value]) => ({ name, value }))
  return sort ? rows.sort((a, b) => b.value - a.value) : rows
}

function truncate(label: string, max = 20) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

function sum(rows: ChartRow[]) {
  return rows.reduce((acc, r) => acc + r.value, 0)
}

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-[--border] bg-[--surface] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[--text-secondary]">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[--border] text-[--text-muted]">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-[--text-primary]">
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-[--text-muted]">{hint}</p>}
      </div>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-xl border border-[--border] bg-[--surface] ${className}`}
    >
      <header className="border-b border-[--border] px-5 py-3.5">
        <h3 className="text-sm font-semibold text-[--text-primary]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-[--text-muted]">{subtitle}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-[--border] px-2 py-0.5 text-xs font-medium text-[--text-muted]">
        No change
      </span>
    )
  }
  const rising = delta > 0
  const Icon = rising ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
        rising ? 'bg-red-500/10 text-p0-text' : 'bg-emerald-500/10 text-[--status-green]'
      }`}
    >
      <Icon className="h-3 w-3" />
      {rising ? '+' : ''}
      {delta}
    </span>
  )
}

type TooltipProps = {
  active?: boolean
  payload?: Array<{ value: number; payload: ChartRow }>
  total: number
}

function ChartTooltip({ active, payload, total }: TooltipProps) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="rounded-lg border border-[--border] bg-[--surface] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[--text-primary]">{PRIORITY_LABEL[name] ? `${name} · ${PRIORITY_LABEL[name]}` : name}</p>
      <p className="mt-0.5 text-xs tabular-nums text-[--text-secondary]">
        {value} complaints ({pct}%)
      </p>
    </div>
  )
}

function HorizontalBars({ data }: { data: ChartRow[] }) {
  const total = sum(data)
  const height = Math.max(200, data.length * 34 + 20)

  if (data.length === 0) return <EmptyState text="No data yet." />

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={10}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ ...AXIS_TICK, fill: 'var(--text-secondary)' }}
          tickFormatter={(v: string) => truncate(v)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={CURSOR_STYLE} content={<ChartTooltip total={total} />} />
        <Bar dataKey="value" fill="var(--zinc-800)" radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center text-sm text-[--text-muted]">{text}</div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[--border]/60 ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(false)
    adminApi
      .analytics()
      .then(({ data }) => setAnalytics(data))
      .catch(() => setError(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveBlob = (data: Blob, filename: string) => {
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key)
    try {
      await task()
    } finally {
      setBusy(null)
    }
  }

  const download = (format: 'csv' | 'json' | 'pdf') =>
    run(format, async () => {
      const { data } = await adminApi.export(format)
      saveBlob(data, `complaints.${format}`)
    })

  const downloadComparisonReport = () =>
    run('comparison', async () => {
      const { data } = await adminApi.exportComparisonReport('pdf')
      saveBlob(data, 'comparison_report.pdf')
    })

  const downloadIntelligenceReport = () =>
    run('intelligence', async () => {
      const { data } = await adminApi.exportIntelligenceReport('pdf')
      saveBlob(data, 'intelligence_report.pdf')
    })

  const categoryData = useMemo(
    () => (analytics ? toChartData(analytics.category_distribution) : []),
    [analytics],
  )
  const departmentData = useMemo(
    () => (analytics ? toChartData(analytics.department_distribution) : []),
    [analytics],
  )
  const priorityData = useMemo(() => {
    if (!analytics) return []
    const rows = toChartData(analytics.priority_distribution, false)
    return rows.sort((a, b) => {
      const ia = PRIORITY_ORDER.indexOf(a.name)
      const ib = PRIORITY_ORDER.indexOf(b.name)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [analytics])

  const risingCategories = useMemo(
    () => (analytics ? analytics.category_trend.filter((t) => t.delta > 0).slice(0, 5) : []),
    [analytics],
  )

  if (error) {
    return (
      <AppShell title="Admin Dashboard">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[--border] bg-[--surface] py-16">
          <p className="text-sm font-medium text-[--text-primary]">Couldn’t load analytics</p>
          <p className="text-xs text-[--text-muted]">Check your connection and try again.</p>
          <Button variant="secondary" onClick={load}>Retry</Button>
        </div>
      </AppShell>
    )
  }

  if (!analytics) {
    return (
      <AppShell title="Admin Dashboard">
        <DashboardSkeleton />
      </AppShell>
    )
  }

  const priorityTotal = sum(priorityData)
  const agreement =
    analytics.pipeline_agreement_rate != null
      ? `${Math.round(analytics.pipeline_agreement_rate * 100)}%`
      : '—'
  const avgResolution =
    analytics.avg_resolution_hours != null ? `${analytics.avg_resolution_hours.toFixed(1)}h` : '—'

  return (
    <AppShell
      title="Admin Dashboard"
      actions={
        <div className="flex gap-2">
          {(['csv', 'json', 'pdf'] as const).map((f) => (
            <Button key={f} variant="secondary" onClick={() => download(f)} disabled={busy !== null}>
              <span className="inline-flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                {busy === f ? 'Exporting…' : f.toUpperCase()}
              </span>
            </Button>
          ))}
        </div>
      }
    >
      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Total complaints" value={analytics.total_complaints.toLocaleString()} icon={FileStack} />
        <KpiCard label="Resolved today" value={analytics.resolved_today.toLocaleString()} icon={CheckCircle2} />
        <KpiCard label="Pipeline conflicts" value={analytics.pipeline_conflicts.toLocaleString()} icon={GitCompare} />
        <KpiCard label="Pipeline agreement" value={agreement} icon={ShieldCheck} hint="GenAI vs ground truth" />
        <KpiCard label="Avg resolution" value={avgResolution} icon={Clock} hint="Last 7 days" />
      </div>

      {/* Distributions */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Categories" subtitle="Complaints by category">
          <HorizontalBars data={categoryData} />
        </ChartCard>

        <ChartCard title="Priority" subtitle="Complaints by severity">
          {priorityData.length === 0 ? (
            <EmptyState text="No data yet." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={CURSOR_STYLE} content={<ChartTooltip total={priorityTotal} />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44}>
                    {priorityData.map((entry) => (
                      <Cell key={entry.name} fill={PRIORITY_DOT[entry.name] ?? 'var(--zinc-400)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[--border] pt-4">
                {priorityData.map((p) => (
                  <li key={p.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-[--text-secondary]">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: PRIORITY_DOT[p.name] ?? 'var(--zinc-400)' }}
                      />
                      {PRIORITY_LABEL[p.name] ?? p.name}
                    </span>
                    <span className="font-medium tabular-nums text-[--text-primary]">{p.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ChartCard>

        <ChartCard title="Departments" subtitle="Complaints by department">
          <HorizontalBars data={departmentData} />
        </ChartCard>
      </div>

      {/* Trends */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Weekly trend" subtitle="This week compared with last week">
          <div className="grid grid-cols-2 divide-x divide-[--border]">
            {[
              { label: 'Complaint volume', t: analytics.volume_trend },
              { label: 'Escalations', t: analytics.escalation_trend },
            ].map(({ label, t }, i) => (
              <div key={label} className={i === 0 ? 'pr-5' : 'pl-5'}>
                <p className="text-xs text-[--text-muted]">{label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-[--text-primary]">
                  {t.this_week}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <DeltaBadge delta={t.delta} />
                  <span className="text-xs tabular-nums text-[--text-muted]">vs {t.last_week} last week</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Rising categories" subtitle="Categories with more complaints than last week">
          {risingCategories.length === 0 ? (
            <EmptyState text="Nothing is trending up this week." />
          ) : (
            <ul className="divide-y divide-[--border]">
              {risingCategories.map((t) => (
                <li key={t.category} className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0">
                  <span className="text-[--text-primary]">{t.category}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs tabular-nums text-[--text-muted]">
                      {t.last_week} → {t.this_week}
                    </span>
                    <DeltaBadge delta={t.delta} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      {/* Top categories + data assets */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Top categories" subtitle="Share of all complaints">
          {categoryData.length === 0 ? (
            <EmptyState text="No data yet." />
          ) : (
            <ol className="space-y-3">
              {categoryData.slice(0, 5).map((row, i) => {
                const total = sum(categoryData)
                const pct = total > 0 ? (row.value / total) * 100 : 0
                return (
                  <li key={row.name}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-[--text-primary]">
                        <span className="mr-2 tabular-nums text-[--text-muted]">{i + 1}</span>
                        {row.name}
                      </span>
                      <span className="tabular-nums text-[--text-secondary]">
                        {row.value}
                        <span className="ml-1.5 text-xs text-[--text-muted]">{Math.round(pct)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[--border]">
                      <div
                        className="h-full rounded-full bg-[--zinc-800]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </ChartCard>

        <ChartCard title="Data assets" subtitle="Records available to the pipelines">
          <dl className="grid grid-cols-2 gap-3">
            {Object.entries(analytics.data_assets).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-[--border] px-4 py-3">
                <dt className="text-xs capitalize text-[--text-muted]">{key.replace(/_/g, ' ')}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-[--text-primary]">{value}</dd>
              </div>
            ))}
          </dl>
        </ChartCard>
      </div>

      {/* Reports */}
      <section className="rounded-xl border border-[--border] bg-[--surface] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[--text-primary]">Structured reports</h3>
            <p className="mt-0.5 text-xs text-[--text-muted]">Download detailed PDF reports for review and audit.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={downloadComparisonReport} disabled={busy !== null}>
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {busy === 'comparison' ? 'Generating…' : 'GenAI vs ground-truth report'}
              </span>
            </Button>
            <Button variant="secondary" onClick={downloadIntelligenceReport} disabled={busy !== null}>
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {busy === 'intelligence' ? 'Generating…' : 'Complaint intelligence report'}
              </span>
            </Button>
          </div>
        </div>
      </section>
    </AppShell>
  )
}