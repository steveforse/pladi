import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterRow } from '@/components/movies/FilterRow'
import type { ActiveFilter, FilterFieldId } from '@/lib/types'

vi.mock('@/components/movies/FieldPicker', () => ({
  FieldPicker: ({ onChange }: { value: FilterFieldId; onChange: (field: FilterFieldId) => void }) => (
    <div>
      <button type="button" onClick={() => onChange('poster')}>pick-poster</button>
      <button type="button" onClick={() => onChange('year')}>pick-year</button>
    </div>
  ),
}))

function filter(overrides?: Partial<ActiveFilter>): ActiveFilter {
  return {
    id: 1,
    field: 'title',
    op: 'includes',
    value: 'Alpha',
    ...overrides,
  }
}

describe('FilterRow', () => {
  it('switches to a null-only field and resets operator/value', async () => {
    const onChange = vi.fn()

    const view = render(
      <FilterRow filter={filter()} onChange={onChange} onRemove={() => {}} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'pick-poster' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      field: 'poster',
      op: 'present',
      value: '',
    }))
    view.unmount()
  })

  it('preserves null operator when switching fields and handles remove', async () => {
    const onChange = vi.fn()
    const onRemove = vi.fn()

    const view = render(
      <FilterRow filter={filter({ field: 'poster', op: 'missing', value: '' })} onChange={onChange} onRemove={onRemove} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'pick-year' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      field: 'year',
      op: 'missing',
      value: '',
    }))

    await userEvent.click(screen.getByRole('button', { name: 'Remove filter' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('updates op/value and renders unit for numeric fields', async () => {
    const onChange = vi.fn()

    const view = render(
      <FilterRow filter={filter({ field: 'duration', op: 'gte', value: '90' })} onChange={onChange} onRemove={() => {}} />
    )

    expect(screen.getByText('min')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByRole('combobox'), 'lt')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: 'lt', value: '' }))

    const input = screen.getByPlaceholderText('value')
    fireEvent.change(input, { target: { value: '120' } })
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ value: '120' }))
    view.unmount()
  })
})
