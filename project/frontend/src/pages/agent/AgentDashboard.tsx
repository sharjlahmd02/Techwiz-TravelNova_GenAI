import { CheckCircle2, Inbox } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { SLAIndicator } from '../../components/ui/SLAIndicator'
import { FollowUpBadge } from '../../components/ui/FollowUpBadge'
import { Input, Select } from '../../components/ui/Input'
import { StatCard } from '../../components/ui/Card'
import { Pagination } from '../../components/ui/Pagination'
import { Table } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { agentApi } from '../../services/agent'
import { adminApi } from '../../services/admin'
import type { StaffComplaintSummary } from '../../types/staff'
import type { Category } from '../../types/admin'
import type { ComplaintStatus, Priority } from '../../types/complaint'

const PAGE_SIZE = 20
const SENTIMENTS = ['Positive', 'Neutral', 'Negative', 'Very Negative']

export function AgentDashboard() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [complaints, setComplaints] = useState<StaffComplaintSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('')
  const [escalationFilter, setEscalationFilter] = useState<'' | 'escalated' | 'not_escalated'>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [metrics, setMetrics] = useState<{ resolved_count: number; open_count: number } | null>(null)
  const prevOpenCount = useRef<number | null>(null)

  useEffect(() => {
    adminApi.listCategories().then(({ data }) => setCategories(data)).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const load = async () => {
    const { data } = await agentApi.list({
      page,
      page_size: PAGE_SIZE,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      search: search || undefined,
      category: categoryFilter || undefined,
      sentiment: sentimentFilter || undefined,
      escalation_status: escalationFilter || undefined,
    })
    setComplaints(data.items)
    setTotal(data.total)
    const { data: m } = await agentApi.metrics()
    if (prevOpenCount.current !== null && m.open_count > prevOpenCount.current) {
      show(`${m.open_count - prevOpenCount.current} new complaint(s) assigned to your department`, 'info')
    }
    prevOpenCount.current = m.open_count
    setMetrics(m)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, priorityFilter, categoryFilter, sentimentFilter, escalationFilter, search])

  return (
    <AppShell title="Complaints">
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="My Open" value={metrics?.open_count ?? '…'} icon={Inbox} />
        <StatCard label="My Resolved" value={metrics?.resolved_count ?? '…'} icon={CheckCircle2} />
      </div>

      <div className="mb-4 flex gap-3">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search title, description, or ID…"
          className="w-64"
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setPage(1)
            setStatusFilter(e.target.value as ComplaintStatus | '')
          }}
          className="w-48"
        >
          <option value="">All statuses</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="awaiting_customer">Awaiting Customer</option>
          <option value="resolved">Resolved</option>
        </Select>
        <Select
          value={priorityFilter}
          onChange={(e) => {
            setPage(1)
            setPriorityFilter(e.target.value as Priority | '')
          }}
          className="w-40"
        >
          <option value="">All priorities</option>
          <option value="P0">P0 Critical</option>
          <option value="P1">P1 High</option>
          <option value="P2">P2 Medium</option>
          <option value="P3">P3 Low</option>
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) => {
            setPage(1)
            setCategoryFilter(e.target.value)
          }}
          className="w-48"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </Select>
        <Select
          value={sentimentFilter}
          onChange={(e) => {
            setPage(1)
            setSentimentFilter(e.target.value)
          }}
          className="w-40"
        >
          <option value="">All sentiments</option>
          {SENTIMENTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select
          value={escalationFilter}
          onChange={(e) => {
            setPage(1)
            setEscalationFilter(e.target.value as '' | 'escalated' | 'not_escalated')
          }}
          className="w-44"
        >
          <option value="">Any escalation status</option>
          <option value="escalated">Escalated</option>
          <option value="not_escalated">Not escalated</option>
        </Select>
      </div>

      <Table
        rows={complaints}
        keyFor={(c) => c.id}
        onRowClick={(c) => navigate(`/agent/complaints/${c.id}`)}
        isP0={(c) => c.priority === 'P0'}
        emptyMessage="No complaints match these filters."
        columns={[
          { header: 'ID', accessor: (c) => <span className="font-mono text-xs">{c.complaint_id}</span> },
          { header: 'Priority', accessor: (c) => <PriorityBadge priority={c.priority} /> },
          { header: 'Title', accessor: (c) => c.title, className: 'max-w-xs truncate' },
          { header: 'Status', accessor: (c) => <StatusBadge status={c.status} /> },
          { header: 'SLA', accessor: (c) => <SLAIndicator createdAt={c.created_at} deadline={c.sla_resolution_deadline} /> },
          { header: 'Follow-up', accessor: (c) => <FollowUpBadge dueAt={c.next_follow_up_at} /> },
          { header: 'Received', accessor: (c) => new Date(c.created_at).toLocaleDateString() },
        ]}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </AppShell>
  )
}
