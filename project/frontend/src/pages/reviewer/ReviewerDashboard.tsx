import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Table } from '../../components/ui/Table'
import { reviewerApi } from '../../services/reviewer'
import type { StaffComplaintSummary } from '../../types/staff'

export function ReviewerDashboard() {
  const navigate = useNavigate()
  const [conflicts, setConflicts] = useState<StaffComplaintSummary[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await reviewerApi.listConflicts()
      setConflicts(data)
    }
    load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AppShell title="Conflict Queue">
      <Table
        rows={conflicts}
        keyFor={(c) => c.id}
        onRowClick={(c) => navigate(`/reviewer/conflicts/${c.id}`)}
        emptyMessage="No pipeline conflicts right now — nice."
        columns={[
          { header: 'ID', accessor: (c) => <span className="font-mono text-xs">{c.complaint_id}</span> },
          { header: 'Title', accessor: (c) => c.title, className: 'max-w-sm truncate' },
          { header: 'Product', accessor: (c) => c.product_type },
          {
            header: 'Duplicate?',
            accessor: (c) => (c.is_duplicate ? <span className="text-xs text-[--status-yellow]">Possible dup</span> : '—'),
          },
          { header: 'Received', accessor: (c) => new Date(c.created_at).toLocaleString() },
        ]}
      />
    </AppShell>
  )
}
