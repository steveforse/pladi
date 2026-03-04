import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SetupPage from '@/components/SetupPage'
import { ApiError, api } from '@/lib/apiClient'

vi.mock('@/lib/apiClient', () => {
  class MockApiError extends Error {
    status: number
    data: unknown

    constructor(message: string, status = 422, data: unknown = null) {
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

describe('SetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates form client-side before API call', async () => {
    const view = render(<SetupPage onComplete={() => {}} />)

    await userEvent.type(screen.getByLabelText('Email address'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'abc')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'xyz')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(mockedApi.post).not.toHaveBeenCalled()
    view.unmount()
  })

  it('calls onComplete after successful setup', async () => {
    const onComplete = vi.fn()
    mockedApi.post.mockResolvedValue({ ok: true, status: 201, data: { email_address: 'user@example.com' } })

    const view = render(<SetupPage onComplete={onComplete} />)

    await userEvent.type(screen.getByLabelText('Email address'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalled()
      expect(onComplete).toHaveBeenCalledTimes(1)
    })
    view.unmount()
  })

  it('shows server-side setup errors', async () => {
    mockedApi.post.mockRejectedValue(
      new ApiError('Unprocessable', 422, { errors: ['Email has already been taken'] })
    )

    const view = render(<SetupPage onComplete={() => {}} />)

    await userEvent.type(screen.getByLabelText('Email address'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Email has already been taken')).toBeInTheDocument()
    view.unmount()
  })

  it('trims/validates email on blur and clears error when corrected', async () => {
    const view = render(<SetupPage onComplete={() => {}} />)

    const email = screen.getByLabelText('Email address')
    await userEvent.type(email, ' invalid ')
    await userEvent.tab()
    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument()

    await userEvent.clear(email)
    await userEvent.type(email, 'valid@example.com')
    expect(screen.queryByText('Please enter a valid email address.')).not.toBeInTheDocument()
    view.unmount()
  })

  it('blocks submit for invalid email format', async () => {
    const view = render(<SetupPage onComplete={() => {}} />)

    await userEvent.type(screen.getByLabelText('Email address'), 'invalid-email')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument()
    expect(mockedApi.post).not.toHaveBeenCalled()
    view.unmount()
  })

  it('handles ApiError with single error string payload', async () => {
    mockedApi.post.mockRejectedValue(
      new ApiError('Bad request', 422, { error: 'Setup failed' })
    )

    const view = render(<SetupPage onComplete={() => {}} />)

    await userEvent.type(screen.getByLabelText('Email address'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Setup failed')).toBeInTheDocument()
    view.unmount()
  })

  it('shows network fallback error for non-ApiError failures', async () => {
    mockedApi.post.mockRejectedValue(new Error('offline'))

    const view = render(<SetupPage onComplete={() => {}} />)

    await userEvent.type(screen.getByLabelText('Email address'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument()
    view.unmount()
  })
})
