import React from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'

vi.mock('@/components/MoviesTable', () => ({ default: () => <div>movies-page</div> }))
vi.mock('@/components/LoginPage', () => ({ default: () => <div>login-page</div> }))
vi.mock('@/components/SetupPage', () => ({ default: () => <div>setup-page</div> }))
vi.mock('@/components/SettingsPage', () => ({ default: () => <div>settings-page</div> }))
vi.mock('@/components/HistoryPage', () => ({ default: () => <div>history-page</div> }))

describe('App auth bootstrap', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('falls back to unauthenticated when /api/me request fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network failure'))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByText('login-page')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows setup page when /api/me is not ok and setup is needed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ needed: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByText('setup-page')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
