import React from 'react'
import { Select } from '@/components/ui/select'

export function Paginator({
  page,
  totalPages,
  pageSize,
  total,
  itemLabel = 'movies',
  onPage,
  onPageSize,
  leftSlot,
  centerSlot,
}: {
  page: number
  totalPages: number
  pageSize: number
  total: number
  itemLabel?: string
  onPage: (p: number) => void
  onPageSize: (n: number) => void
  leftSlot?: React.ReactNode
  centerSlot?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <p className="text-xs text-muted-foreground">
        {total} {itemLabel}
        {pageSize > 0 && total > pageSize && (
          <> &mdash; page {page} of {totalPages}</>
        )}
      </p>
      {centerSlot && <div className="flex-1 flex justify-center">{centerSlot}</div>}
      <div className="flex items-center gap-1 ml-auto">
        {leftSlot && <div className="mr-3">{leftSlot}</div>}
        <button onClick={() => onPage(1)} disabled={page === 1}
          className="btn px-3 py-1.5 text-sm">«</button>
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="btn px-3 py-1.5 text-sm">‹</button>
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="btn px-3 py-1.5 text-sm">›</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
          className="btn px-3 py-1.5 text-sm">»</button>
      </div>
      <Select
        value={pageSize}
        onChange={(e) => onPageSize(Number(e.target.value))}
        className="min-w-32"
      >
        {[25, 50, 100, 250].map((n) => (
          <option key={n} value={n}>{n} per page</option>
        ))}
        <option value={0}>All</option>
      </Select>
    </div>
  )
}
