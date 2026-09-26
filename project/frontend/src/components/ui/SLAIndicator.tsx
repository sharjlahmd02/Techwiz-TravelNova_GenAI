function formatDuration(ms: number): string {
  const abs = Math.abs(ms)
  const hours = Math.floor(abs / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  return `${hours}h ${minutes}m`
}

export function SLAIndicator({ createdAt, deadline }: { createdAt: string | null; deadline: string | null }) {
  if (!deadline || !createdAt) {
    return <span className="text-xs text-[--text-muted]">&mdash;</span>
  }

  const now = Date.now()
  const start = new Date(createdAt).getTime()
  const end = new Date(deadline).getTime()
  const total = end - start
  const remaining = end - now
  const pctRemaining = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0

  const breached = remaining <= 0
  let color = 'bg-[--status-green]'
  if (breached) color = 'bg-[--status-red]'
  else if (pctRemaining < 0.25) color = 'bg-[--status-red]'
  else if (pctRemaining < 0.5) color = 'bg-[--status-yellow]'

  return (
    <div className="w-20">
      <div className="h-1 w-full overflow-hidden rounded-full bg-[--zinc-200]">
        <div
          className={`h-full rounded-full ${color} ${breached ? 'animate-pulse' : ''}`}
          style={{ width: breached ? '100%' : `${pctRemaining * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-[--text-muted]">
        {breached ? `Breached ${formatDuration(remaining)} ago` : `${formatDuration(remaining)} left`}
      </p>
    </div>
  )
}

export function slaStatus(createdAt: string | null, deadline: string | null): 'on-track' | 'at-risk' | 'breached' | 'none' {
  if (!deadline || !createdAt) return 'none'
  const now = Date.now()
  const start = new Date(createdAt).getTime()
  const end = new Date(deadline).getTime()
  const remaining = end - now
  if (remaining <= 0) return 'breached'
  const total = end - start
  const pct = total > 0 ? remaining / total : 1
  return pct < 0.25 ? 'at-risk' : 'on-track'
}
