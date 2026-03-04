import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '@/components/LoginPage'
import { ApiError, api } from '@/lib/apiClient'

vi.mock('@/lib/apiClient', () => {
  class MockApiError extends Error {
    status: number
    data: unknown

    constructor(message: string, status = 401, data: unknown = null) {
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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits credentials and calls onLogin on success', async () => {
    const onLogin = vi.fn()
    mockedApi.post.mockResolvedValue({ ok: true, status: 200, data: null })

    const view = render(<LoginPage onLogin={onLogin} />)

    await userEvent.type(screen.getByLabelText('Email address'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/session',
        { email_address: 'user@example.com', password: 'secret' },
        { csrf: true }
      )
      expect(onLogin).toHaveBeenCalledTimes(1)
    })
    view.unmount()
  })

  it('shows API error messages on failed login', async () => {
    mockedApi.post.mockRejectedValue(new ApiError('Invalid credentials'))

    const view = render(<LoginPage onLogin={() => {}} />)

    await userEvent.type(screen.getByLabelText('Email address'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'badpass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    view.unmount()
  })
})
