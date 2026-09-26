import type { Priority, ComplaintStatus } from '../../types/complaint'

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string; bg: string; border: string; text: string }> = {
  P0: { label: 'P0 Critical', dot: 'bg-p0-dot', bg: 'bg-p0-bg', border: 'border-p0-border', text: 'text-p0-text' },
  P1: { label: 'P1 High', dot: 'bg-p1-dot', bg: 'bg-p1-bg', border: 'border-p1-border', text: 'text-p1-text' },
  P2: { label: 'P2 Medium', dot: 'bg-p2-dot', bg: 'bg-p2-bg', border: 'border-p2-border', text: 'text-p2-text' },
  P3: { label: 'P3 Low', dot: 'bg-p3-dot', bg: 'bg-p3-bg', border: 'border-p3-border', text: 'text-p3-text' },
}

export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) {
    return <span className="text-xs text-[--text-muted]">&mdash;</span>
  }
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.border} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${priority === 'P0' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  )
}

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; bg: string; text: string }> = {
  submitted: { label: 'Submitted', bg: 'bg-[--zinc-100]', text: 'text-[--zinc-600]' },
  validating: { label: 'Validating', bg: 'bg-[--zinc-100]', text: 'text-[--zinc-600]' },
  processing: { label: 'Processing', bg: 'bg-[--status-blue-bg]', text: 'text-[--status-blue]' },
  under_review: { label: 'Under Review', bg: 'bg-[--status-yellow-bg]', text: 'text-[--status-yellow]' },
  assigned: { label: 'Assigned', bg: 'bg-[--status-blue-bg]', text: 'text-[--status-blue]' },
  in_progress: { label: 'In Progress', bg: 'bg-[--status-blue-bg]', text: 'text-[--status-blue]' },
  awaiting_customer: { label: 'Awaiting Reply', bg: 'bg-[--zinc-100]', text: 'text-[--zinc-600]' },
  resolved: { label: 'Resolved', bg: 'bg-[--status-green-bg]', text: 'text-[--status-green]' },
  closed: { label: 'Closed', bg: 'bg-[--zinc-100]', text: 'text-[--text-muted]' },
  reopened: { label: 'Reopened', bg: 'bg-[--status-yellow-bg]', text: 'text-[--status-yellow]' },
  escalated: { label: 'Escalated', bg: 'bg-p0-bg', text: 'text-p0-text' },
}

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

const SEVERITY_CONFIG: Record<string, { label: string; text: string }> = {
  none: { label: 'None', text: 'text-[--text-muted]' },
  minor: { label: 'Minor', text: 'text-[--conflict-minor-text]' },
  major: { label: 'Major', text: 'text-[--conflict-major-text]' },
  critical: { label: 'Critical', text: 'text-[--conflict-critical-text]' },
  genai_unavailable: { label: 'GenAI Unavailable', text: 'text-[--conflict-critical-text]' },
}

export function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.none
  return <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
}
