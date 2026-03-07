import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

function mockBaseGets(servers: Array<{ id: number; name: string; url: string }> = []) {
  mockedApi.get.mockImplementation(async (path: string) => {
    if (path === '/api/me') {
      return { ok: true, status: 200, data: { email_address: 'user@example.com' } }
    }
    if (path === '/api/plex_servers') {
      return { ok: true, status: 200, data: servers }
    }
    return { ok: false, status: 404, data: null }
  })
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    expect(await screen.findByDisplayValue('user@example.com')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Servers' }))
    expect(await screen.findByText('Home')).toBeInTheDocument()
    view.unmount()
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

    const view = render(
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
    view.unmount()
  })

  it('shows network fallback when email update throws non-ApiError', async () => {
    mockBaseGets()
    mockedApi.patch.mockRejectedValueOnce(new Error('offline'))

    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    const emailInput = await screen.findByDisplayValue('user@example.com')
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'new@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Update email' }))

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument()
    view.unmount()
  })

  it('updates preference toggle and calls callback', async () => {
    const onDownloadImagesChange = vi.fn()
    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/me') return { ok: true, status: 200, data: { email_address: 'user@example.com' } }
      if (path === '/api/plex_servers') return { ok: true, status: 200, data: [] }
      return { ok: false, status: 404, data: null }
    })
    mockedApi.patch.mockResolvedValue({ ok: true, status: 200, data: null })

    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={onDownloadImagesChange}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Preferences' }))
    expect(screen.getByText('Experimental: this may be slower on large libraries and can put extra load on your Plex server.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox'))

    await waitFor(() => {
      expect(onDownloadImagesChange).toHaveBeenCalledWith(true)
      expect(mockedApi.patch).toHaveBeenCalled()
    })
    view.unmount()
  })

  it('validates email format client-side before submit', async () => {
    mockBaseGets()
    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    const emailInput = await screen.findByDisplayValue('user@example.com')
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'not-an-email')
    await userEvent.tab()

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Update email' }))
    expect(mockedApi.patch).not.toHaveBeenCalled()
    view.unmount()
  })

  it('submits password update and shows success', async () => {
    mockBaseGets()
    mockedApi.patch.mockResolvedValue({ ok: true, status: 200, data: null })

    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    await userEvent.type(screen.getByLabelText('New password'), 'newpass123')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    expect(screen.getByLabelText('New password')).toHaveValue('')
    expect(screen.getByLabelText('Confirm new password')).toHaveValue('')
    view.unmount()
  })

  it('shows password mismatch validation and blocks request', async () => {
    mockBaseGets()
    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    await userEvent.type(screen.getByLabelText('New password'), 'newpass123')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different')
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(mockedApi.patch).not.toHaveBeenCalled()
    view.unmount()
  })

  it('shows password API and network errors', async () => {
    mockBaseGets()
    mockedApi.patch
      .mockRejectedValueOnce(new ApiError('Bad password'))
      .mockRejectedValueOnce(new Error('offline'))

    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    await userEvent.type(screen.getByLabelText('New password'), 'newpass123')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }))
    expect(await screen.findByText('Bad password')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Update password' }))
    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument()
    view.unmount()
  })

  it('looks up name when adding server and creates it with trimmed token', async () => {
    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/me') return { ok: true, status: 200, data: { email_address: 'user@example.com' } }
      if (path === '/api/plex_servers') return { ok: true, status: 200, data: [] }
      if (path === '/api/plex_servers/lookup_name') return { ok: true, status: 200, data: { name: 'Detected Server' } }
      return { ok: false, status: 404, data: null }
    })
    mockedApi.post.mockResolvedValue({ ok: true, status: 201, data: { id: 1 } })

    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Servers' }))
    await userEvent.click(screen.getByRole('button', { name: '+ Add Server' }))

    const urlInput = screen.getByPlaceholderText('URL (e.g. https://plex.example.com)')
    const tokenInput = screen.getByPlaceholderText('Plex token')

    await userEvent.type(urlInput, 'http://plex.local')
    await userEvent.type(tokenInput, ' token123 ')
    await userEvent.tab()

    expect(await screen.findByDisplayValue('Detected Server')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/api/plex_servers',
      { plex_server: { name: 'Detected Server', url: 'http://plex.local', token: 'token123' } },
      { csrf: true }
    )
    view.unmount()
  })

  it('shows joined API errors when server update fails and delete error fallback', async () => {
    mockBaseGets([{ id: 1, name: 'Home', url: 'http://plex.local' }])
    mockedApi.patch.mockRejectedValueOnce(new ApiError('update failed', 422, { errors: ['Bad URL', 'Bad token'] }))
    mockedApi.del.mockRejectedValueOnce(new Error('delete failed'))

    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Servers' }))
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Bad URL, Bad token')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Failed to delete server')).toBeInTheDocument()
    view.unmount()
  })

  it('does not lookup name when url/token are missing and supports add-server cancel', async () => {
    mockBaseGets()
    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Servers' }))
    expect(screen.getByText('No Plex servers configured yet.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+ Add Server' }))

    const tokenInput = screen.getByPlaceholderText('Plex token')
    await userEvent.type(tokenInput, 'abc')
    await userEvent.tab()
    expect(mockedApi.get).not.toHaveBeenCalledWith('/api/plex_servers/lookup_name', expect.any(Object))

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: '+ Add Server' })).toBeInTheDocument()
    view.unmount()
  })

  it('shows create-server fallback error for non-ApiError', async () => {
    mockBaseGets()
    mockedApi.post.mockRejectedValueOnce(new Error('boom'))

    const view = render(
      <SettingsPage
        onBack={() => {}}
        downloadImages={false}
        onDownloadImagesChange={() => {}}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Servers' }))
    await userEvent.click(screen.getByRole('button', { name: '+ Add Server' }))

    await userEvent.type(screen.getByPlaceholderText('URL (e.g. https://plex.example.com)'), 'http://plex.local')
    await userEvent.type(screen.getByPlaceholderText('Plex token'), 'token123')
    await userEvent.type(screen.getByPlaceholderText('Name (e.g. Home Server)'), 'Home')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Failed to create server')).toBeInTheDocument()
    view.unmount()
  })
})
