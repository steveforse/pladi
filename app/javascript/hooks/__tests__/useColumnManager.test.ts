import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useColumnManager } from '@/hooks/useColumnManager'
import { DEFAULT_COL_ORDER } from '@/lib/columns'

function createSessionStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
}

describe('useColumnManager', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createSessionStorageMock())
  })

  it('starts with defaults and toggles visibility', () => {
    const { result } = renderHook(() => useColumnManager())
    expect(result.current.colOrder).toEqual(DEFAULT_COL_ORDER)

    act(() => {
      result.current.handleColChange('year', false)
    })
    expect(result.current.visibleCols.has('year')).toBe(false)

    act(() => {
      result.current.handleColChange('year', true)
    })
    expect(result.current.visibleCols.has('year')).toBe(true)
  })

  it('reorders columns through drag/drop handlers', () => {
    const { result } = renderHook(() => useColumnManager())
    const first = result.current.colOrder[0]
    const second = result.current.colOrder[1]

    act(() => {
      result.current.handleColDragStart(first)
      result.current.handleColDragOver({ preventDefault: vi.fn() } as unknown as React.DragEvent, second)
      result.current.handleColDrop(second)
    })

    expect(result.current.colOrder[0]).toBe(second)
    expect(result.current.colOrder[1]).toBe(first)
    expect(result.current.dragOverCol).toBeNull()
  })

  it('resets to default layout', () => {
    const { result } = renderHook(() => useColumnManager())

    act(() => {
      result.current.handleColChange('year', false)
      result.current.handleColDragStart(result.current.colOrder[0])
      result.current.handleColDrop(result.current.colOrder[2])
    })
    expect(result.current.visibleCols.has('year')).toBe(false)

    act(() => {
      result.current.resetColumns()
    })
    expect(result.current.visibleCols.has('year')).toBe(true)
    expect(result.current.colOrder).toEqual(DEFAULT_COL_ORDER)
  })
})
