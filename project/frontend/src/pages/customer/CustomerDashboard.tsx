import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { StatCard } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { complaintsApi } from '../../services/complaints'
import type { ComplaintSummary } from '../../types/complaint'

export function CustomerDashboard() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <AppShell
      title="My Complaints"
      actions={
        <Button onClick={() => navigate('/customer/complaints/new')}>Submit Complaint</Button>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Open Complaints" value={loading ? '…' : openCount} />
        <StatCard label="Total Submitted" value={loading ? '…' : complaints.length} />
        <StatCard label="Resolved" value={loading ? '…' : complaints.length - openCount} />
      </div>

      {!loading && complaints.length === 0 ? (
        <EmptyState
          heading="You haven't submitted any complaints yet."
          subtext="When you submit a complaint, it'll show up here with live status updates."
          action={<Button onClick={() => navigate('/customer/complaints/new')}>Submit your first complaint →</Button>}
        />
      ) : (
        <Table
          rows={complaints}
          keyFor={(c) => c.id}
          onRowClick={(c) => navigate(`/customer/complaints/${c.id}`)}
          isP0={(c) => c.priority === 'P0'}
          columns={[
            { header: 'ID', accessor: (c) => <span className="font-mono text-xs">{c.complaint_id}</span> },
            { header: 'Subject', accessor: (c) => c.title, className: 'max-w-xs truncate' },
            { header: 'Service', accessor: (c) => c.product_type },
            { header: 'Priority', accessor: (c) => <PriorityBadge priority={c.priority} /> },
            { header: 'Status', accessor: (c) => <StatusBadge status={c.status} /> },
            { header: 'Date', accessor: (c) => new Date(c.created_at).toLocaleDateString() },
          ]}
        />
      )}
    </AppShell>
  )
}
