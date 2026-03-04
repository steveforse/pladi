import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsPage from '@/components/SettingsPage'
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

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('loads account + servers data and renders servers tab', async () => {
    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/me') {
        return { ok: true, status: 200, data: { email_address: 'user@example.com' } }
      }
      if (path === '/api/plex_servers') {
        return {
          ok: true,
          status: 200,
          data: [{ id: 1, name: 'Home', url: 'http://plex.local' }],
        }
      }
      return { ok: false, status: 404, data: null }
    })

    render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    expect(await screen.findByDisplayValue('user@example.com')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Servers' }))
    expect(await screen.findByText('Home')).toBeInTheDocument()
  })

  it('shows server error when email update fails', async () => {
    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/me') {
        return { ok: true, status: 200, data: { email_address: 'old@example.com' } }
      }
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [] }
      }
      return { ok: false, status: 404, data: null }
    })
    mockedApi.patch.mockRejectedValueOnce(new ApiError('Failed to update email.'))

    render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    const emailInput = await screen.findByDisplayValue('old@example.com')
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'new@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Update email' }))

    expect(await screen.findByText('Failed to update email.')).toBeInTheDocument()
  })

  it('updates preference toggle and calls callback', async () => {
    const onDownloadImagesChange = vi.fn()
    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/me') return { ok: true, status: 200, data: { email_address: 'user@example.com' } }
      if (path === '/api/plex_servers') return { ok: true, status: 200, data: [] }
      return { ok: false, status: 404, data: null }
    })
    mockedApi.patch.mockResolvedValue({ ok: true, status: 200, data: null })

    render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={onDownloadImagesChange}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Preferences' }))
    await userEvent.click(screen.getByRole('checkbox'))

    await waitFor(() => {
      expect(onDownloadImagesChange).toHaveBeenCalledWith(true)
      expect(mockedApi.patch).toHaveBeenCalled()
    })
  })
})
