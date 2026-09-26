import type { ReactNode } from 'react'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-lg border border-[--border] bg-[--surface] p-6 shadow-lg"
        style={{ maxWidth: width }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[--text-primary]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-sm text-[--text-secondary] hover:bg-[--zinc-100] hover:text-[--text-primary]"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-4 flex justify-end gap-2 border-t border-[--zinc-100] pt-4">{footer}</div>}
      </div>
    </div>
  )
}
