import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { Table } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/admin'
import type { EmailIntakeLog, EmailIntakeOutcome } from '../../types/admin'

const OUTCOME_LABELS: Record<EmailIntakeOutcome, string> = {
  complaint_created: 'Complaint created',
  attached_to_existing: 'Attached to existing complaint',
  unclassified: 'Unclassified (needs a look)',
  manual_review_unverified_sender: 'Manual review -- unverified sender',
  manual_review_unregistered_sender: 'Manual review -- unregistered sender',
}

const OUTCOME_STYLES: Record<EmailIntakeOutcome, string> = {
  complaint_created: 'text-[--status-green]',
  attached_to_existing: 'text-[--status-green]',
  unclassified: 'text-[--status-yellow]',
  manual_review_unverified_sender: 'text-p0-text',
  manual_review_unregistered_sender: 'text-[--status-yellow]',
}

export function EmailIntakePage() {
  const { show } = useToast()
  const [logs, setLogs] = useState<EmailIntakeLog[]>([])
  const [outcomeFilter, setOutcomeFilter] = useState<EmailIntakeOutcome | ''>('')
  const [polling, setPolling] = useState(false)

  const load = async () => {
    const { data } = await adminApi.listEmailIntakeLogs(outcomeFilter || undefined)
    setLogs(data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcomeFilter])

  const pollNow = async () => {
    setPolling(true)
    try {
      await adminApi.triggerEmailIntakeNow()
      show('Inbox poll started -- refresh in a moment to see new results', 'success')
    } catch {
      show('Failed to start inbox poll', 'error')
    } finally {
      setPolling(false)
    }
  }

  return (
    <AppShell
      title="Email Intake"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load}>Refresh</Button>
          <Button onClick={pollNow} loading={polling}>Poll inbox now</Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-[--text-muted]">
        Every email fetched from the complaint inbox is logged here, whether or not it became a
        complaint -- the "unclassified bucket" and "manual review queue" from the intake flow.
      </p>

      <div className="mb-4 flex gap-3">
        <Select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value as EmailIntakeOutcome | '')}
          className="w-72"
        >
          <option value="">All outcomes</option>
          {(Object.keys(OUTCOME_LABELS) as EmailIntakeOutcome[]).map((o) => (
            <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>
          ))}
        </Select>
      </div>

      <Table
        rows={logs}
        keyFor={(l) => l.id}
        emptyMessage="No emails have been processed yet."
        columns={[
          { header: 'From', accessor: (l) => <span className="font-mono text-xs">{l.from_address}</span> },
          { header: 'Subject', accessor: (l) => l.subject || '(no subject)', className: 'max-w-xs truncate' },
          {
            header: 'Outcome',
            accessor: (l) => <span className={`text-xs font-medium ${OUTCOME_STYLES[l.outcome]}`}>{OUTCOME_LABELS[l.outcome]}</span>,
          },
          { header: 'Reason', accessor: (l) => l.reason || '—', className: 'max-w-xs truncate text-xs text-[--text-muted]' },
          { header: 'Processed', accessor: (l) => new Date(l.processed_at).toLocaleString() },
        ]}
      />
    </AppShell>
  )
}
