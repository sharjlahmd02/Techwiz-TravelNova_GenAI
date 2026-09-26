import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { adminApi } from '../../services/admin'
import type { AuditLogEntry } from '../../types/admin'

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 50

  useEffect(() => {
    adminApi.auditLog({ page, page_size: pageSize }).then(({ data }) => {
      setEntries(data.items)
      setTotal(data.total)
    })
  }, [page])

  return (
    <AppShell title="Audit Log">
      <Table
        rows={entries}
        keyFor={(e) => e.id}
        emptyMessage="No audit entries yet."
        columns={[
          { header: 'Complaint', accessor: (e) => <span className="font-mono text-xs">{e.complaint_id.slice(0, 8)}</span> },
          { header: 'Action', accessor: (e) => <span className="capitalize">{e.action.replace('_', ' ')}</span> },
          { header: 'Performed By', accessor: (e) => (e.performed_by ? e.performed_by.slice(0, 8) : 'System') },
          { header: 'Notes', accessor: (e) => e.notes ?? '—', className: 'max-w-sm truncate' },
          { header: 'Timestamp', accessor: (e) => new Date(e.created_at).toLocaleString() },
        ]}
      />

      <div className="mt-4 flex items-center justify-end gap-3 text-sm text-[--text-secondary]">
        <span>
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
        </span>
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
        <Button variant="secondary" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </AppShell>
  )
}
