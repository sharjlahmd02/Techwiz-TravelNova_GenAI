import type { ReactNode } from 'react'

export function EmptyState({
  heading,
  subtext,
  action,
}: {
  heading: string
  subtext?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <h3 className="text-md font-medium text-[--text-primary]">{heading}</h3>
      {subtext && <p className="max-w-sm text-sm text-[--text-muted]">{subtext}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
