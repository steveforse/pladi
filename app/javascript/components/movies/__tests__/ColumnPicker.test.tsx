import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ColumnPicker } from '@/components/movies/ColumnPicker'
import type { ColumnGroup, ColumnId } from '@/lib/types'

const groups: ColumnGroup[] = [
  {
    label: 'General',
    columns: [
      { id: 'id', label: 'ID' },
      { id: 'year', label: 'Year' },
    ],
  },
  {
    label: 'Media',
    columns: [
      { id: 'poster', label: 'Poster' },
    ],
  },
]

describe('ColumnPicker', () => {
  it('opens picker, toggles a single column, and resets', async () => {
    const onChange = vi.fn()
    const onReset = vi.fn()

    const view = render(
      <ColumnPicker
        groups={groups}
        visible={new Set<ColumnId>(['id'])}
        onChange={onChange}
        onReset={onReset}
      />
    )

    expect(screen.getByText('(1/3)')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Toggle Columns/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Year' }))
    expect(onChange).toHaveBeenCalledWith('year', true)

    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(onReset).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('toggles a full group and closes on outside click', async () => {
    const onChange = vi.fn()

    const view = render(
      <ColumnPicker
        groups={groups}
        visible={new Set<ColumnId>(['id'])}
        onChange={onChange}
        onReset={() => {}}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /Toggle Columns/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'General' }))

    expect(onChange).toHaveBeenCalledWith('id', true)
    expect(onChange).toHaveBeenCalledWith('year', true)

    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Reset to defaults')).not.toBeInTheDocument()
    view.unmount()
  })
})
