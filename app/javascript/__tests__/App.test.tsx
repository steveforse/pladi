import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'

vi.mock('@/components/MoviesTable', () => ({
  default: ({
    onSettings,
    onHistory,
    onShows,
    onLogout,
    downloadImages,
  }: {
    onSettings: () => void
    onHistory: () => void
    onShows: () => void
    onLogout: () => void
    downloadImages: boolean
  }) => (
    <div>
      <div>movies-page</div>
      <div>download-images:{String(downloadImages)}</div>
      <button onClick={onSettings}>to-settings</button>
      <button onClick={onHistory}>to-history</button>
      <button onClick={onShows}>to-shows</button>
      <button onClick={onLogout}>logout</button>
    </div>
  ),
}))
vi.mock('@/components/ShowsTable', () => ({
  default: ({ onMovies }: { onMovies: () => void }) => (
    <div>
      <div>shows-page</div>
      <button onClick={onMovies}>to-movies</button>
    </div>
  ),
}))
vi.mock('@/components/LoginPage', () => ({
  default: ({ onLogin }: { onLogin: () => void }) => (
    <div>
      <div>login-page</div>
      <button onClick={onLogin}>login-now</button>
    </div>
  ),
}))
vi.mock('@/components/SetupPage', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <div>
      <div>setup-page</div>
      <button onClick={onComplete}>setup-done</button>
    </div>
  ),
}))
vi.mock('@/components/SettingsPage', () => ({
  default: ({
    onBack,
    downloadImages,
  }: {
    onBack: () => void
    downloadImages: boolean
    onDownloadImagesChange: (value: boolean) => void
  }) => (
    <div>
      <div>settings-page</div>
      <div>settings-images:{String(downloadImages)}</div>
      <button onClick={onBack}>settings-back</button>
    </div>
  ),
}))
vi.mock('@/components/HistoryPage', () => ({
  default: ({ onBack }: { onBack: () => void }) => (
    <div>
      <div>history-page</div>
      <button onClick={onBack}>history-back</button>
    </div>
  ),
}))

describe('App auth bootstrap', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/movies')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('falls back to unauthenticated when /api/me request fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network failure'))
    vi.stubGlobal('fetch', fetchMock)

    const view = render(<App />)

    expect(await screen.findByText('login-page')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    view.unmount()
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

    const view = render(<App />)

    expect(await screen.findByText('setup-page')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    view.unmount()
  })

  it('renders movies when authenticated and supports settings/history/logout callbacks', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ email_address: 'user@example.com', download_images: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const view = render(<App />)

    expect(await screen.findByText('movies-page')).toBeInTheDocument()
    expect(screen.getByText('download-images:true')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'to-settings' }))
    expect(await screen.findByText('settings-page')).toBeInTheDocument()
    expect(screen.getByText('settings-images:true')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'settings-back' }))
    expect(await screen.findByText('movies-page')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'to-history' }))
    expect(await screen.findByText('history-page')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'history-back' }))
    expect(await screen.findByText('movies-page')).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: 'to-shows' }))
    expect(await screen.findByText('shows-page')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'to-movies' }))
    expect(await screen.findByText('movies-page')).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: 'logout' }))
    expect(await screen.findByText('login-page')).toBeInTheDocument()
    view.unmount()
  })

  it('transitions from setup and login callbacks into movies', async () => {
    const setupFetch = vi
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
    vi.stubGlobal('fetch', setupFetch)

    const view = render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'setup-done' }))
    expect(await screen.findByText('movies-page')).toBeInTheDocument()
    view.unmount()

    const loginFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
    vi.stubGlobal('fetch', loginFetch)

    {
      const view = render(<App />)
      await userEvent.click(await screen.findByRole('button', { name: 'login-now' }))
      expect(await screen.findByText('movies-page')).toBeInTheDocument()
      view.unmount()
    }
  })
})
