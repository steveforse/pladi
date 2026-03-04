import { useEffect, useRef, useState } from 'react'

export function usePagination(totalCount: number) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const prevCountRef = useRef(totalCount)

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalCount / pageSize))

  useEffect(() => {
    if (prevCountRef.current === totalCount) return
    prevCountRef.current = totalCount
    const timer = window.setTimeout(() => setPage(1), 0)
    return () => window.clearTimeout(timer)
  }, [totalCount])

  function handlePageSize(n: number) {
    setPageSize(n)
    setPage(1)
  }

  return { page, setPage, pageSize, totalPages, handlePageSize }
}
