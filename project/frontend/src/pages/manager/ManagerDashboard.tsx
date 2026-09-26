import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'
import { Table } from '../../components/ui/Table'
import { managerApi } from '../../services/manager'
import type { StaffComplaintSummary } from '../../types/staff'
import type { ManagerAnalytics } from '../../types/admin'
import type { ComplaintStatus, Priority } from '../../types/complaint'

const PAGE_SIZE = 20

export function ManagerDashboard() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<StaffComplaintSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [analytics, setAnalytics] = useState<ManagerAnalytics | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    const load = async () => {
      const [complaintsRes, analyticsRes] = await Promise.all([
        managerApi.list({
          page,
          page_size: PAGE_SIZE,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          search: search || undefined,
        }),
        managerApi.analytics(),
      ])
      setComplaints(complaintsRes.data.items)
      setTotal(complaintsRes.data.total)
      setAnalytics(analyticsRes.data)
    }
    load()
    const interval = setInterval(load, 15_000)
    return () => clearInterval(interval)
  }, [page, statusFilter, priorityFilter, search])

  return (
    <AppShell title="Manager Dashboard">
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Open" value={analytics?.total_open ?? '…'} />
        <StatCard
          label="By Priority"
          value={
            analytics ? (
              <span className="text-sm font-normal">
                P0:{analytics.by_priority.P0 ?? 0} P1:{analytics.by_priority.P1 ?? 0} P2:{analytics.by_priority.P2 ?? 0} P3:
                {analytics.by_priority.P3 ?? 0}
              </span>
            ) : (
              '…'
            )
          }
        />
        <StatCard
          label="SLA Compliance"
          value={analytics?.sla_compliance_rate != null ? `${Math.round(analytics.sla_compliance_rate * 100)}%` : '—'}
        />
        <StatCard
          label="Conflict Rate"
          value={analytics?.conflict_rate != null ? `${Math.round(analytics.conflict_rate * 100)}%` : '—'}
        />
      </div>

      {analytics && analytics.departments.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-lg border border-[--border] bg-[--surface]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="h-10 border-b border-[--border] bg-[--zinc-50] text-xs font-medium text-[--text-secondary]">
                <th className="px-4">Department</th>
                <th className="px-4">Open</th>
                <th className="px-4">Resolved</th>
                <th className="px-4">Avg Resolution</th>
                <th className="px-4">SLA %</th>
              </tr>
            </thead>
            <tbody>
              {analytics.departments.map((d) => (
                <tr key={d.department_id} className="h-11 border-b border-[--zinc-100] last:border-b-0">
                  <td className="px-4">{d.department_name}</td>
                  <td className="px-4">{d.open_complaints}</td>
                  <td className="px-4">{d.resolved_complaints}</td>
                  <td className="px-4">{d.avg_resolution_hours != null ? `${d.avg_resolution_hours.toFixed(1)}h` : '—'}</td>
                  <td className="px-4">{d.sla_compliance_rate != null ? `${Math.round(d.sla_compliance_rate * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          <option value="submitted">Submitted</option>
          <option value="processing">Processing</option>
          <option value="under_review">Under Review</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
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
      </div>

      <Table
        rows={complaints}
        keyFor={(c) => c.id}
        onRowClick={(c) => navigate(`/manager/complaints/${c.id}`)}
        isP0={(c) => c.priority === 'P0'}
        emptyMessage="No complaints match these filters."
        columns={[
          { header: 'ID', accessor: (c) => <span className="font-mono text-xs">{c.complaint_id}</span> },
          { header: 'Priority', accessor: (c) => <PriorityBadge priority={c.priority} /> },
          { header: 'Title', accessor: (c) => c.title, className: 'max-w-xs truncate' },
          { header: 'Status', accessor: (c) => <StatusBadge status={c.status} /> },
          { header: 'Received', accessor: (c) => new Date(c.created_at).toLocaleDateString() },
        ]}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </AppShell>
  )
}
