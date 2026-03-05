import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistory } from '@/hooks/useHistory'
import { ApiError, api } from '@/lib/apiClient'

vi.mock('@/lib/apiClient', () => {
  class MockApiError extends Error {
    status: number
    data: unknown

    constructor(message: string, status = 500, data: unknown = null) {
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

describe('useHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads logs successfully', async () => {
    mockedApi.get.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        {
          id: 1,
          field_name: 'title',
          field_type: 'scalar',
          old_value: 'Old',
          new_value: 'New',
          created_at: '2026-01-01T12:00:00Z',
          media_type: 'movie',
          media_id: 'm1',
          media_title: 'Movie',
          section_title: 'Movies',
          plex_server: { id: 1, name: 'Main' },
        },
      ],
    })

    const { result } = renderHook(() => useHistory())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.logs).toHaveLength(1)
      expect(result.current.logs[0].field_name).toBe('title')
    })
  })

  it('sets error when API call fails', async () => {
    mockedApi.get.mockRejectedValue(new ApiError('Request failed (500)'))

    const { result } = renderHook(() => useHistory())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Request failed (500)')
      expect(result.current.logs).toEqual([])
    })
  })

  it('handles non-ApiError failures with generic message mapping', async () => {
    mockedApi.get.mockRejectedValue('bad')

    const { result } = renderHook(() => useHistory())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Unknown error')
    })
  })

  it('handles native Error failures', async () => {
    mockedApi.get.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useHistory())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('boom')
    })
  })
})
