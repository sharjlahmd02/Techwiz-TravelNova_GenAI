import { CheckCircle2, ChevronRight, FileStack, Inbox, Search, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CustomerShell } from '../../components/customer/CustomerShell'
import { Button } from '../../components/ui/Button'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Input'
import { complaintsApi } from '../../services/complaints'
import type { ComplaintStatus, ComplaintSummary } from '../../types/complaint'

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  submitted: 'Submitted',
  validating: 'Validating',
  processing: 'Processing',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  awaiting_customer: 'Awaiting Reply',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
  escalated: 'Escalated',
}

function StatCard({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100">
          <Icon className="h-4 w-4 text-zinc-500" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A0A0A]">{value}</p>
    </div>
  )
}

export function CustomerDashboard() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await complaintsApi.list()
        if (!cancelled) setComplaints(data.items)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 10_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const openCount = complaints.filter((c) => !['resolved', 'closed'].includes(c.status)).length

  const statusOptions = useMemo(
    () => Array.from(new Set(complaints.map((c) => c.status))).sort(),
    [complaints],
  )

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase()
    return complaints.filter((c) => {
      const matchesSearch =
        !query ||
        c.title.toLowerCase().includes(query) ||
        c.complaint_id.toLowerCase().includes(query) ||
        c.product_type.toLowerCase().includes(query)
      const matchesStatus = !statusFilter || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [complaints, search, statusFilter])

  return (
    <CustomerShell title="My Complaints" actions={<Button onClick={() => navigate('/customer/complaints/new')}>Submit Complaint</Button>}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Open Complaints" value={loading ? '…' : openCount} icon={Inbox} />
        <StatCard label="Total Submitted" value={loading ? '…' : complaints.length} icon={FileStack} />
        <StatCard label="Resolved" value={loading ? '…' : complaints.length - openCount} icon={CheckCircle2} />
      </div>

      {!loading && complaints.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-300">
          <EmptyState
            heading="You haven't submitted any complaints yet."
            subtext="When you submit a complaint, it'll show up here with live status updates."
            action={<Button onClick={() => navigate('/customer/complaints/new')}>Submit your first complaint →</Button>}
          />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search complaints…"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-[#0A0A0A] placeholder:text-zinc-400 transition-all duration-150 focus:border-[#0A0A0A] focus:outline-none focus:shadow-[0_0_0_3px_rgba(10,10,10,0.08)]"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ComplaintStatus | '')}
              className="sm:w-48"
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-300">
              <EmptyState heading="No complaints match your filters." subtext="Try a different search term or status." />
            </div>
          ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-300">
          <table className="w-full text-left">
            <thead>
              <tr className="h-11 border-b border-zinc-200 bg-zinc-50">
                <th className="px-6 text-xs font-medium text-zinc-500">Complaint</th>
                <th className="px-4 text-xs font-medium text-zinc-500">Priority</th>
                <th className="px-4 text-xs font-medium text-zinc-500">Status</th>
                <th className="px-4 text-xs font-medium text-zinc-500">Date</th>
                <th className="w-10 px-4" />
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customer/complaints/${c.id}`)}
                  className={`group h-[68px] cursor-pointer border-b border-zinc-100 last:border-b-0 transition-colors hover:bg-zinc-50 ${
                    c.priority === 'P0' ? 'border-l-[3px] border-l-p0-dot hover:bg-p0-bg' : ''
                  }`}
                >
                  <td className="px-6">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{c.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                      <span className="font-mono">{c.complaint_id}</span>
                      <span className="text-zinc-300">·</span>
                      {c.product_type}
                    </p>
                  </td>
                  <td className="px-4">
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td className="px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 text-sm text-zinc-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4">
                    <ChevronRight className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-zinc-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </CustomerShell>
  )
}
