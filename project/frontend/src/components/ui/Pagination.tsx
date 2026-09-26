import { Button } from './Button'

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
      <Button variant="secondary" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        Prev
      </Button>
      <Button variant="secondary" disabled={page * pageSize >= total} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  )
}
