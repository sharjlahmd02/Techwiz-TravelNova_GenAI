import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  heading,
  subtext,
  action,
}: {
  icon?: LucideIcon
  heading: string
  subtext?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      {Icon && <Icon className="mb-2 h-12 w-12 text-[--zinc-300]" strokeWidth={1.5} />}
      <h3 className="text-md font-semibold text-[--text-primary]">{heading}</h3>
      {subtext && <p className="max-w-sm text-sm text-[--text-muted]">{subtext}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
