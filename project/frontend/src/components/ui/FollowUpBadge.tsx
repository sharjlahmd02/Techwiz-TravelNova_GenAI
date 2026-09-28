export function FollowUpBadge({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return <span className="text-xs text-[--text-muted]">&mdash;</span>

  const due = new Date(dueAt).getTime()
  const now = Date.now()
  const overdue = due <= now
  const dueSoon = !overdue && due - now <= 2 * 24 * 60 * 60 * 1000

  const label = new Date(dueAt).toLocaleDateString()
  if (overdue) {
    return (
      <span className="inline-flex items-center rounded-full bg-p0-bg px-2 py-0.5 text-xs font-medium text-p0-text">
        Follow up overdue &middot; {label}
      </span>
    )
  }
  if (dueSoon) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        Follow up due &middot; {label}
      </span>
    )
  }
  return <span className="text-xs text-[--text-muted]">Follow up {label}</span>
}
