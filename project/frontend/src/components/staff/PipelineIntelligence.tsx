import type { EntitiesExtracted, PolicyReference } from '../../types/staff'

const SENTIMENT_STYLES: Record<string, string> = {
  'Very Negative': 'bg-p0-bg text-p0-text',
  Negative: 'bg-amber-50 text-amber-700',
  Neutral: 'bg-zinc-100 text-zinc-600',
  Positive: 'bg-[--status-green-bg] text-[--status-green]',
}

const POLICY_STATUS_STYLES: Record<string, string> = {
  Applicable: 'bg-[--status-green-bg] text-[--status-green]',
  'Conditionally Applicable': 'bg-amber-50 text-amber-700',
  'Not Applicable': 'bg-zinc-100 text-zinc-500',
  Outdated: 'bg-p0-bg text-p0-text',
}

function formatEntities(entities: EntitiesExtracted | null | undefined): string[] {
  if (!entities) return []
  const lines: string[] = []
  if (entities.booking_reference) lines.push(`Booking ref: ${entities.booking_reference}`)
  if (entities.monetary_amounts?.length) lines.push(`Amounts: ${entities.monetary_amounts.join(', ')}`)
  if (entities.flight_numbers?.length) lines.push(`Flight #: ${entities.flight_numbers.join(', ')}`)
  if (entities.names?.length) lines.push(`Names: ${entities.names.join(', ')}`)
  if (entities.dates?.length) lines.push(`Dates: ${entities.dates.join(', ')}`)
  if (entities.locations?.length) lines.push(`Locations: ${entities.locations.join(', ')}`)
  return lines
}

export function SentimentBadge({ sentiment, score }: { sentiment: string | null | undefined; score?: number | null }) {
  if (!sentiment) return <span className="text-[--text-primary]">—</span>
  const style = SENTIMENT_STYLES[sentiment] ?? 'bg-zinc-100 text-zinc-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {sentiment}
      {typeof score === 'number' ? ` (${score.toFixed(2)})` : ''}
    </span>
  )
}

export function EntitiesList({ entities }: { entities: EntitiesExtracted | null | undefined }) {
  const lines = formatEntities(entities)
  if (!lines.length) return <span className="text-[--text-primary]">—</span>
  return (
    <ul className="space-y-0.5 text-[--text-primary]">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  )
}

function humanizeValidationIssue(issue: string): string {
  const colonIndex = issue.indexOf(':')
  if (colonIndex === -1) {
    return issue.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  }
  const code = issue.slice(0, colonIndex).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  const detail = issue.slice(colonIndex + 1).replace(/^'|'$/g, '')
  return `${code}: ${detail}`
}

export function ValidationIssuesList({ issues }: { issues: string[] | null | undefined }) {
  if (!issues?.length) return null
  return (
    <ul className="flex flex-wrap gap-1.5">
      {issues.map((issue) => (
        <li
          key={issue}
          className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
        >
          {humanizeValidationIssue(issue)}
        </li>
      ))}
    </ul>
  )
}

export const ESCALATION_LEVEL_LABELS: Record<number, string> = {
  0: 'No Escalation',
  1: 'Supervisor Review',
  2: 'Department Manager',
  3: 'Specialist Team',
  4: 'Compliance Review',
  5: 'Critical Management Escalation',
}

export function escalationLevelLabel(level: number | null | undefined): string {
  if (level == null) return '—'
  return ESCALATION_LEVEL_LABELS[level] ?? `Level ${level}`
}

export function PolicyReferenceList({ references }: { references: (string | PolicyReference)[] | null | undefined }) {
  if (!references?.length) return <span className="text-[--text-primary]">—</span>
  return (
    <ul className="flex flex-wrap gap-1.5">
      {references.map((ref, i) => {
        const documentId = typeof ref === 'string' ? ref : ref.document_id
        const status = typeof ref === 'string' ? null : ref.status
        return (
          <li
            key={`${documentId}-${i}`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status ? POLICY_STATUS_STYLES[status] ?? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-100 text-zinc-600'}`}
          >
            <span className="font-mono">{documentId}</span>
            {status && <span className="opacity-75">· {status}</span>}
          </li>
        )
      })}
    </ul>
  )
}
