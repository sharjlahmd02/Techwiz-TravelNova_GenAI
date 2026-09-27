import type { EntitiesExtracted } from '../../types/staff'

const SENTIMENT_STYLES: Record<string, string> = {
  'Very Negative': 'bg-p0-bg text-p0-text',
  Negative: 'bg-amber-50 text-amber-700',
  Neutral: 'bg-zinc-100 text-zinc-600',
  Positive: 'bg-[--status-green-bg] text-[--status-green]',
}

function formatEntities(entities: EntitiesExtracted | null | undefined): string[] {
  if (!entities) return []
  const lines: string[] = []
  if (entities.booking_reference) lines.push(`Booking ref: ${entities.booking_reference}`)
  if (entities.monetary_amounts?.length) lines.push(`Amounts: ${entities.monetary_amounts.join(', ')}`)
  if (entities.flight_numbers?.length) lines.push(`Flight #: ${entities.flight_numbers.join(', ')}`)
  if (entities.names?.length) lines.push(`Names: ${entities.names.join(', ')}`)
  if (entities.dates?.length) lines.push(`Dates: ${entities.dates.join(', ')}`)
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
