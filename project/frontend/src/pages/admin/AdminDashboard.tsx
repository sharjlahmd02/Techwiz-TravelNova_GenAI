import { CheckCircle2, FileStack, GitCompare, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppShell } from '../../components/layout/AppShell'
import { StatCard, Panel } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { adminApi } from '../../services/admin'
import type { AdminAnalytics } from '../../types/admin'

const PRIORITY_DOT: Record<string, string> = {
  P0: 'var(--p0-dot)',
  P1: 'var(--p1-dot)',
  P2: 'var(--p2-dot)',
  P3: 'var(--p3-dot)',
}

function toChartData(record: Record<string, number>) {
  return Object.entries(record).map(([name, value]) => ({ name, value }))
}

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)

  useEffect(() => {
    adminApi.analytics().then(({ data }) => setAnalytics(data))
  }, [])

  const download = async (format: 'csv' | 'json' | 'pdf') => {
    const { data } = await adminApi.export(format)
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `complaints.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!analytics) {
    return (
      <AppShell title="Admin Dashboard">
        <p className="text-sm text-[--text-muted]">Loading…</p>
      </AppShell>
    )
  }

  const topCategories = Object.entries(analytics.category_distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <AppShell
      title="Admin Dashboard"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => download('csv')}>Export CSV</Button>
          <Button variant="secondary" onClick={() => download('json')}>Export JSON</Button>
          <Button variant="secondary" onClick={() => download('pdf')}>Export PDF</Button>
        </div>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Complaints" value={analytics.total_complaints} icon={FileStack} />
        <StatCard label="Resolved Today" value={analytics.resolved_today} icon={CheckCircle2} />
        <StatCard label="Pipeline Conflicts" value={analytics.pipeline_conflicts} icon={GitCompare} />
        <StatCard
          label="Pipeline Agreement"
          icon={ShieldCheck}
          value={analytics.pipeline_agreement_rate != null ? `${Math.round(analytics.pipeline_agreement_rate * 100)}%` : '—'}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Category Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={toChartData(analytics.category_distribution)} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--zinc-800)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Priority Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={toChartData(analytics.priority_distribution)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {toChartData(analytics.priority_distribution).map((entry) => (
                  <Cell key={entry.name} fill={PRIORITY_DOT[entry.name] ?? 'var(--zinc-400)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Top Categories">
          <ol className="space-y-2 text-sm">
            {topCategories.map(([name, count], i) => (
              <li key={name} className="flex items-center justify-between">
                <span className="text-[--text-primary]">{i + 1}. {name}</span>
                <span className="text-[--text-secondary]">{count}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Data Assets">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(analytics.data_assets).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs capitalize text-[--text-muted]">{key.replace('_', ' ')}</dt>
                <dd className="font-semibold text-[--text-primary]">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </AppShell>
  )
}
