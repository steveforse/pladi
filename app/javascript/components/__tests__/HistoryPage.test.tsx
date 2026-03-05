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
        media_type: 'movie',
        media_id: 'm1',
        media_title: 'Movie',
        section_title: 'Movies',
        plex_server: { id: 1, name: 'Main' },
      }],
    })

    render(<HistoryPage onBack={() => {}} />)
    expect(screen.getByRole('cell', { name: 'Movie(movie)' })).toBeInTheDocument()
    expect(screen.getByText('Old')).toBeInTheDocument()
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('renders empty state when no logs exist', () => {
    mockedUseHistory.mockReturnValue({ logs: [], loading: false, error: null })
    render(<HistoryPage onBack={() => {}} />)
    expect(screen.getByText('No edit history yet.')).toBeInTheDocument()
  })

  it('formats tag values for valid arrays, invalid json, and nulls', () => {
    mockedUseHistory.mockReturnValue({
      loading: false,
      error: null,
      logs: [
        {
          id: 1,
          field_name: 'labels',
          field_type: 'tag',
          old_value: '[]',
          new_value: '["A","B"]',
          created_at: '2026-01-01T00:00:00Z',
          media_type: 'movie',
          media_id: 'm1',
          media_title: 'Movie',
          section_title: 'Movies',
          plex_server: { id: 1, name: 'Main' },
        },
        {
          id: 2,
          field_name: 'genres',
          field_type: 'tag',
          old_value: 'not-json',
          new_value: null,
          created_at: '2026-01-01T00:00:00Z',
          media_type: 'movie',
          media_id: 'm2',
          media_title: 'Movie 2',
          section_title: 'Movies',
          plex_server: { id: 1, name: 'Main' },
        },
      ],
    })

    render(<HistoryPage onBack={() => {}} />)
    expect(screen.getByText('A, B')).toBeInTheDocument()
    expect(screen.getByText('not-json')).toBeInTheDocument()
    expect(screen.getByText('labels')).toBeInTheDocument()
    expect(screen.getByText('genres')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('renders fallback for empty scalar values', () => {
    mockedUseHistory.mockReturnValue({
      loading: false,
      error: null,
      logs: [{
        id: 1,
        field_name: 'title',
        field_type: 'scalar',
        old_value: '',
        new_value: '',
        created_at: '2026-01-01T00:00:00Z',
        media_type: 'movie',
        media_id: 'm1',
        media_title: 'Movie',
        section_title: 'Movies',
        plex_server: { id: 1, name: 'Main' },
      }],
    })

    render(<HistoryPage onBack={() => {}} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})
