import { useRef, useState } from 'react'

export function usePagination(totalCount: number) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalCount / pageSize))

  // Auto-reset to page 1 whenever total count changes
  const prevCount = useRef(totalCount)
  if (prevCount.current !== totalCount) {
    prevCount.current = totalCount
    if (page !== 1) setPage(1)
  }

  function handlePageSize(n: number) {
    setPageSize(n)
    setPage(1)
  }

  return { page, setPage, pageSize, totalPages, handlePageSize }
}
