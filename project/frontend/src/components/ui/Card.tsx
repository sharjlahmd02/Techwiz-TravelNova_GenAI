import type { ReactNode } from 'react'

export function StatCard({ label, value, delta }: { label: string; value: ReactNode; delta?: string }) {
  return (
    <div className="rounded-lg border border-[--border] bg-[--surface] p-5 shadow-sm">
      <p className="text-xs font-medium text-[--text-secondary]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[--text-primary]">{value}</p>
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
