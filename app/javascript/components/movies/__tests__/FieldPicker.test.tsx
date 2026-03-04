import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FieldPicker } from '@/components/movies/FieldPicker'

describe('FieldPicker', () => {
  it('renders selected label and selects a new field', async () => {
    const onChange = vi.fn()

    const view = render(<FieldPicker value="title" onChange={onChange} />)
    expect(screen.getByRole('button', { name: /Title/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Title/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Year' }))

    expect(onChange).toHaveBeenCalledWith('year')
    expect(screen.queryByPlaceholderText('Search fields...')).not.toBeInTheDocument()
    view.unmount()
  })

  it('filters fields and shows empty-state message', async () => {
    const view = render(<FieldPicker value="title" onChange={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: /Title/ }))
    const search = screen.getByPlaceholderText('Search fields...')
    await userEvent.type(search, 'zzzz-no-match')

    expect(screen.getByText('No fields found')).toBeInTheDocument()
    view.unmount()
  })

  it('closes when clicking outside', async () => {
    const view = render(<FieldPicker value="title" onChange={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: /Title/ }))
    expect(screen.getByPlaceholderText('Search fields...')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByPlaceholderText('Search fields...')).not.toBeInTheDocument()
    view.unmount()
  })
})
