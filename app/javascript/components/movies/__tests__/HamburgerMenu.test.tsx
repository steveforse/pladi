import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HamburgerMenu } from '@/components/movies/HamburgerMenu'
import { api } from '@/lib/apiClient'

vi.mock('@/lib/apiClient', () => ({
  ApiError: class extends Error {},
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

describe('HamburgerMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens menu and routes to settings', async () => {
    const onSettings = vi.fn()
    const view = render(<HamburgerMenu onLogout={() => {}} onSettings={onSettings} onHistory={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

    expect(onSettings).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('signs out using api and calls onLogout', async () => {
    const onLogout = vi.fn()
    mockedApi.del.mockResolvedValue({ ok: true, status: 200, data: null })

    const view = render(<HamburgerMenu onLogout={onLogout} onSettings={() => {}} onHistory={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(mockedApi.del).toHaveBeenCalledWith('/session', { csrf: true, throwOnError: false })
      expect(onLogout).toHaveBeenCalledTimes(1)
    })
    view.unmount()
  })
})
