import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Paginator } from '@/components/movies/Paginator'

describe('Paginator', () => {
  it('renders counts and optional slots', () => {
    const view = render(
      <Paginator
        page={2}
        totalPages={4}
        pageSize={25}
        total={100}
        onPage={() => {}}
        onPageSize={() => {}}
        leftSlot={<span>left-slot</span>}
        centerSlot={<span>center-slot</span>}
      />
    )

    expect(screen.getByText(/100 movies/)).toBeInTheDocument()
    expect(screen.getByText(/page 2 of 4/)).toBeInTheDocument()
    expect(screen.getByText('left-slot')).toBeInTheDocument()
    expect(screen.getByText('center-slot')).toBeInTheDocument()
    view.unmount()
  })

  it('handles navigation and page size changes', async () => {
    const onPage = vi.fn()
    const onPageSize = vi.fn()

    const view = render(
      <Paginator
        page={2}
        totalPages={4}
        pageSize={25}
        total={100}
        onPage={onPage}
        onPageSize={onPageSize}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: '«' }))
    await userEvent.click(screen.getByRole('button', { name: '‹' }))
    await userEvent.click(screen.getByRole('button', { name: '›' }))
    await userEvent.click(screen.getByRole('button', { name: '»' }))

    expect(onPage).toHaveBeenNthCalledWith(1, 1)
    expect(onPage).toHaveBeenNthCalledWith(2, 1)
    expect(onPage).toHaveBeenNthCalledWith(3, 3)
    expect(onPage).toHaveBeenNthCalledWith(4, 4)

    await userEvent.selectOptions(screen.getByRole('combobox'), '50')
    expect(onPageSize).toHaveBeenCalledWith(50)
    view.unmount()
  })

  it('hides page detail when not paginated and disables edge buttons', () => {
    const view = render(
      <Paginator
        page={1}
        totalPages={1}
        pageSize={0}
        total={10}
        onPage={() => {}}
        onPageSize={() => {}}
      />
    )

    expect(screen.getByText('10 movies')).toBeInTheDocument()
    expect(screen.queryByText(/page 1 of 1/)).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: '«' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '‹' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '›' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '»' })).toBeDisabled()
    view.unmount()
  })
})
