import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HistoryPage from '@/components/HistoryPage'

vi.mock('@/hooks/useHistory', () => ({
  useHistory: vi.fn(),
}))

import { useHistory } from '@/hooks/useHistory'

const mockedUseHistory = vi.mocked(useHistory)

describe('HistoryPage', () => {
  it('renders loading state', () => {
    mockedUseHistory.mockReturnValue({ logs: [], loading: true, error: null })
    render(<HistoryPage onBack={() => {}} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders error state', () => {
    mockedUseHistory.mockReturnValue({ logs: [], loading: false, error: 'Boom' })
    render(<HistoryPage onBack={() => {}} />)
    expect(screen.getByText('Error: Boom')).toBeInTheDocument()
  })

  it('renders log rows when loaded', () => {
    mockedUseHistory.mockReturnValue({
      loading: false,
      error: null,
      logs: [{
        id: 1,
        field_name: 'title',
        field_type: 'scalar',
        old_value: 'Old',
        new_value: 'New',
        created_at: '2026-01-01T00:00:00Z',
        movie_id: 'm1',
        movie_title: 'Movie',
        section_title: 'Movies',
        plex_server: { id: 1, name: 'Main' },
      }],
    })

    render(<HistoryPage onBack={() => {}} />)
    expect(screen.getByRole('cell', { name: 'Movie' })).toBeInTheDocument()
    expect(screen.getByText('Old')).toBeInTheDocument()
    expect(screen.getByText('New')).toBeInTheDocument()
  })
})
