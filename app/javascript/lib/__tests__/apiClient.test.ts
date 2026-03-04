import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, api } from '@/lib/apiClient'

describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.head.innerHTML = ''
  })

  it('validates successful responses with a schema', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: 42 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const schema = z.object({ value: z.number() })
    const result = await api.get('/api/example', { responseSchema: schema })

    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ value: 42 })
  })

  it('throws ApiError when schema validation fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: 'not-a-number' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const schema = z.object({ value: z.number() })
    await expect(api.get('/api/example', { responseSchema: schema })).rejects.toBeInstanceOf(ApiError)
  })

  it('applies query parameters and CSRF header', async () => {
    document.head.innerHTML = '<meta name="csrf-token" content="token-123">'
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.post('/api/example', { hello: 'world' }, {
      query: { server_id: 7, empty: undefined },
      csrf: true,
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/example?server_id=7')
    const headers = options.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBe('token-123')
  })
})
