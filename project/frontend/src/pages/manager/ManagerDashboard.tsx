import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { managerApi } from '../../services/manager'
import type { StaffComplaintSummary } from '../../types/staff'
import type { ManagerAnalytics } from '../../types/admin'

export function ManagerDashboard() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<StaffComplaintSummary[]>([])
  const [analytics, setAnalytics] = useState<ManagerAnalytics | null>(null)

  useEffect(() => {
    const load = async () => {
      const [complaintsRes, analyticsRes] = await Promise.all([managerApi.list(), managerApi.analytics()])
      setComplaints(complaintsRes.data)
      setAnalytics(analyticsRes.data)
    }
    load()
    const interval = setInterval(load, 15_000)
    return () => clearInterval(interval)
  }, [])

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

      <Table
        rows={complaints}
        keyFor={(c) => c.id}
        onRowClick={(c) => navigate(`/manager/complaints/${c.id}`)}
        isP0={(c) => c.priority === 'P0'}
        columns={[
          { header: 'ID', accessor: (c) => <span className="font-mono text-xs">{c.complaint_id}</span> },
          { header: 'Priority', accessor: (c) => <PriorityBadge priority={c.priority} /> },
          { header: 'Title', accessor: (c) => c.title, className: 'max-w-xs truncate' },
          { header: 'Status', accessor: (c) => <StatusBadge status={c.status} /> },
          { header: 'Received', accessor: (c) => new Date(c.created_at).toLocaleDateString() },
        ]}
      />
    </AppShell>
  )
}
