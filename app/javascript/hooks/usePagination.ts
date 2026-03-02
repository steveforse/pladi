import { useState } from 'react'

export function usePagination(totalCount: number) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [prevCount, setPrevCount] = useState(totalCount)

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalCount / pageSize))

  // Auto-reset to page 1 whenever total count changes
  if (prevCount !== totalCount) {
    setPrevCount(totalCount)
    if (page !== 1) setPage(1)
  }

  function handlePageSize(n: number) {
    setPageSize(n)
    setPage(1)
  }

  return { page, setPage, pageSize, totalPages, handlePageSize }
}
