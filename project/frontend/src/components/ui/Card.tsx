import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  delta,
  size = 'md',
  icon: Icon,
}: {
  label: string
  value: ReactNode
  delta?: string
  size?: 'md' | 'lg'
  icon?: LucideIcon
}) {
  return (
    <div className="rounded-lg border border-[--border] bg-[--surface] p-5 transition-colors hover:border-[--border-strong]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[--text-secondary]">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[--zinc-100]">
            <Icon className="h-4 w-4 text-[--text-secondary]" strokeWidth={2} />
          </span>
        )}
      </div>
      <p className={`mt-2 text-[--text-primary] ${size === 'lg' ? 'text-4xl' : 'text-3xl'}`}>{value}</p>
      {delta && <p className="mt-1 text-xs text-[--text-muted]">{delta}</p>}
    </div>
  )
}

export function Panel({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-[--border] bg-[--surface]">
      {title && (
        <div className="flex items-center justify-between border-b border-[--zinc-100] px-5 py-3">
          <h3 className="text-sm font-semibold text-[--text-primary]">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
