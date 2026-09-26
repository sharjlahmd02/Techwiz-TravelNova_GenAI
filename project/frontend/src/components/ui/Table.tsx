import type { ReactNode } from 'react'

interface Column<T> {
  header: string
  accessor: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  keyFor: (row: T) => string
  onRowClick?: (row: T) => void
  isP0?: (row: T) => boolean
  emptyMessage?: string
}

export function Table<T>({ columns, rows, keyFor, onRowClick, isP0, emptyMessage = 'Nothing here yet.' }: TableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-[--border] bg-[--surface] text-sm text-[--text-muted]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[--border] bg-[--surface]">
      <table className="w-full text-left">
        <thead>
          <tr className="h-10 border-b border-[--border] bg-[--zinc-50]">
            {columns.map((col) => (
              <th key={col.header} className={`px-4 text-xs font-medium text-[--text-secondary] ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyFor(row)}
              onClick={() => onRowClick?.(row)}
              className={`h-12 border-b border-[--zinc-100] last:border-b-0 text-sm text-[--text-primary] ${
                onRowClick ? 'cursor-pointer hover:bg-[--zinc-50]' : ''
              } ${isP0?.(row) ? 'border-l-[3px] border-l-p0-dot' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.header} className={`px-4 ${col.className ?? ''}`}>
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
