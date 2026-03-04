import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WelcomeScreen } from '@/components/movies/WelcomeScreen'
import { ApiError, api } from '@/lib/apiClient'

vi.mock('@/lib/apiClient', () => {
  class MockApiError extends Error {
    status: number
    data: unknown

    constructor(message: string, status = 400, data: unknown = null) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.data = data
    }
  }

  return {
    ApiError: MockApiError,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      del: vi.fn(),
    },
  }
})

const mockedApi = vi.mocked(api)

describe('WelcomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and fills server name from lookup endpoint', async () => {
    mockedApi.get.mockResolvedValue({ ok: true, status: 200, data: { name: 'My Plex Server' } })

    const view = render(<WelcomeScreen onLogout={() => {}} onServerAdded={() => {}} />)

    const urlInput = screen.getByPlaceholderText('https://plex.example.com')
    const tokenInput = screen.getByPlaceholderText('Your Plex auth token')

    await userEvent.type(urlInput, 'http://plex.local')
    await userEvent.type(tokenInput, 'token123')
    await userEvent.tab()

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalled()
      expect(screen.getByDisplayValue('My Plex Server')).toBeInTheDocument()
    })
    view.unmount()
  })

  it('submits first server and emits onServerAdded', async () => {
    const onServerAdded = vi.fn()
    mockedApi.post.mockResolvedValue({
      ok: true,
      status: 201,
      data: { id: 1, name: 'Main', url: 'http://plex.local' },
    })

    const view = render(<WelcomeScreen onLogout={() => {}} onServerAdded={onServerAdded} />)

    await userEvent.type(screen.getByPlaceholderText('https://plex.example.com'), 'http://plex.local')
    await userEvent.type(screen.getByPlaceholderText('Your Plex auth token'), 'token123')
    await userEvent.type(screen.getByPlaceholderText('e.g. Home Server'), 'Main')
    await userEvent.click(screen.getByRole('button', { name: 'Connect server' }))

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalled()
      expect(onServerAdded).toHaveBeenCalledWith({ id: 1, name: 'Main', url: 'http://plex.local' })
    })
    view.unmount()
  })

  it('signs out via api and calls onLogout', async () => {
    const onLogout = vi.fn()
    mockedApi.del.mockResolvedValue({ ok: true, status: 200, data: null })

    const view = render(<WelcomeScreen onLogout={onLogout} onServerAdded={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(mockedApi.del).toHaveBeenCalledWith('/session', { csrf: true, throwOnError: false })
      expect(onLogout).toHaveBeenCalledTimes(1)
    })
    view.unmount()
  })

  it('shows error when server create fails', async () => {
    mockedApi.post.mockRejectedValue(new ApiError('Something went wrong.'))

    const view = render(<WelcomeScreen onLogout={() => {}} onServerAdded={() => {}} />)

    await userEvent.type(screen.getByPlaceholderText('https://plex.example.com'), 'http://plex.local')
    await userEvent.type(screen.getByPlaceholderText('Your Plex auth token'), 'token123')
    await userEvent.type(screen.getByPlaceholderText('e.g. Home Server'), 'Main')
    await userEvent.click(screen.getByRole('button', { name: 'Connect server' }))

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument()
    view.unmount()
  })
})
