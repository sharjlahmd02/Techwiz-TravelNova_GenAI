import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Pagination } from '../../components/ui/Pagination'
import { Table } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { reviewerApi } from '../../services/reviewer'
import type { StaffComplaintSummary } from '../../types/staff'

const PAGE_SIZE = 20

export function ReviewerDashboard() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [conflicts, setConflicts] = useState<StaffComplaintSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const prevTotal = useRef<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await reviewerApi.listConflicts(page, PAGE_SIZE)
      setConflicts(data.items)
      setTotal(data.total)
      if (page === 1) {
        if (prevTotal.current !== null && data.total > prevTotal.current) {
          show(`${data.total - prevTotal.current} new conflict(s) need review`, 'info')
        }
        prevTotal.current = data.total
      }
    }
    load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
  }, [page])

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
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </AppShell>
  )
}
