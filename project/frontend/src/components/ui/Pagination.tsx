import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from './Button'

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-sm text-[--text-secondary]">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <IconButton aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <IconButton aria-label="Next page" disabled={page * pageSize >= total} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  )
}
