import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePagination } from '@/hooks/usePagination'

describe('usePagination', () => {
  it('resets page to 1 when total count changes', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ total }) => usePagination(total), {
      initialProps: { total: 100 },
    })

    act(() => {
      result.current.setPage(3)
    })
    expect(result.current.page).toBe(3)

    rerender({ total: 80 })
    act(() => {
      vi.runAllTimers()
    })
    expect(result.current.page).toBe(1)
    vi.useRealTimers()
  })

  it('resets page to 1 when page size changes', () => {
    const { result } = renderHook(() => usePagination(100))

    act(() => {
      result.current.setPage(4)
    })
    expect(result.current.page).toBe(4)

    act(() => {
      result.current.handlePageSize(10)
    })
    expect(result.current.page).toBe(1)
    expect(result.current.pageSize).toBe(10)
  })
})
