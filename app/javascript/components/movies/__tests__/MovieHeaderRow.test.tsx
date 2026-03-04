import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MovieHeaderRow } from '@/components/movies/MovieHeaderRow'
import { DEFAULT_COL_ORDER } from '@/lib/columns'
import type { AllColumnId, ColumnId } from '@/lib/types'

function renderHeader(overrides?: Partial<React.ComponentProps<typeof MovieHeaderRow>>) {
  const handlers: React.ComponentProps<typeof MovieHeaderRow> = {
    colOrder: ['title', 'id', 'summary'] as AllColumnId[],
    visibleCols: new Set<ColumnId>(['id', 'summary']),
    sortKey: 'title',
    sortDir: 'asc',
    dragOverCol: null,
    allSelected: false,
    someSelected: false,
    onToggleAll: vi.fn(),
    onSort: vi.fn(),
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onDragEnd: vi.fn(),
    ...overrides,
  }

  const view = render(
    <table>
      <thead>
        <MovieHeaderRow {...handlers} />
      </thead>
    </table>
  )

  return { handlers, view }
}

describe('MovieHeaderRow', () => {
  it('renders visible columns and always includes title', () => {
    const { view } = renderHeader({ visibleCols: new Set<ColumnId>(['id']) })

    expect(screen.getByRole('columnheader', { name: /Title/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /ID/ })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /Summary/ })).not.toBeInTheDocument()
    view.unmount()
  })

  it('handles sort and select-all interactions', async () => {
    const { handlers, view } = renderHeader()

    await userEvent.click(screen.getByText('Title'))
    expect(handlers.onSort).toHaveBeenCalledWith('title')

    await userEvent.click(screen.getByRole('checkbox'))
    expect(handlers.onToggleAll).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('sets indeterminate checkbox and handles drag targets', () => {
    const { handlers, view } = renderHeader({ someSelected: true, dragOverCol: 'id' })
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement

    expect(checkbox.indeterminate).toBe(true)

    const idHeader = screen.getByRole('columnheader', { name: /ID/ })
    fireEvent.dragOver(idHeader)
    expect(handlers.onDragOver).toHaveBeenCalledTimes(1)

    fireEvent.drop(idHeader)
    expect(handlers.onDrop).toHaveBeenCalledWith('id')
    view.unmount()
  })

  it('renders every known column header when all columns are visible', () => {
    const allVisibleColumns = DEFAULT_COL_ORDER.filter((id): id is ColumnId => id !== 'title')

    const { view } = renderHeader({
      colOrder: DEFAULT_COL_ORDER,
      visibleCols: new Set<ColumnId>(allVisibleColumns),
    })

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Original Title')).toBeInTheDocument()
    expect(screen.getByText('TMDb Rating')).toBeInTheDocument()
    expect(screen.getByText('Video Codec')).toBeInTheDocument()
    expect(screen.getByText('Audio Tracks')).toBeInTheDocument()
    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.getByText('Poster')).toBeInTheDocument()
    view.unmount()
  })
})
