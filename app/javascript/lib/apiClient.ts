import { getCsrfToken } from '@/lib/csrf'
import type { ZodType } from 'zod'

type QueryValue = string | number | boolean | null | undefined
type QueryParams = Record<string, QueryValue>
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface ApiRequestOptions<Body = unknown> {
  method?: HttpMethod
  query?: QueryParams
  body?: Body
  headers?: HeadersInit
  signal?: AbortSignal
  csrf?: boolean
  throwOnError?: boolean
  responseSchema?: ZodType
}

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function withQuery(path: string, query?: QueryParams): string {
  if (!query) return path
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs.length > 0 ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path
}

async function parseResponseBody(response: Response): Promise<unknown | null> {
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return null
  return response.json().catch(() => null)
}

function resolveErrorMessage(status: number, data: unknown): string {
  if (data && typeof data === 'object') {
    const maybeError = (data as { error?: unknown }).error
    if (typeof maybeError === 'string' && maybeError.length > 0) return maybeError
    const maybeErrors = (data as { errors?: unknown }).errors
    if (Array.isArray(maybeErrors) && maybeErrors.every((v) => typeof v === 'string')) {
      return maybeErrors.join(', ')
    }
  }
  return `Request failed (${status})`
}

export async function apiRequest<T, Body = unknown>(
  path: string,
  options: ApiRequestOptions<Body> = {}
): Promise<ApiResult<T>> {
  const {
    method = 'GET',
    query,
    body,
    headers,
    signal,
    csrf = false,
    throwOnError = true,
    responseSchema,
  } = options

  const requestHeaders = new Headers(headers)
  const hasJsonBody = body !== undefined && !(body instanceof FormData)
  if (hasJsonBody && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (csrf) requestHeaders.set('X-CSRF-Token', getCsrfToken())

  const response = await fetch(withQuery(path, query), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : hasJsonBody ? JSON.stringify(body) : (body as BodyInit),
    signal,
  })
  const data = await parseResponseBody(response)

  let parsedData = data
  if (response.ok && responseSchema && data !== null) {
    const parsed = responseSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError('Invalid response payload', response.status, data)
    }
    parsedData = parsed.data
  }

  if (!response.ok && throwOnError) {
    throw new ApiError(resolveErrorMessage(response.status, data), response.status, data)
  }

  return {
    ok: response.ok,
    status: response.status,
    data: (parsedData as T | null) ?? null,
  }
}

export const api = {
  get<T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
    return apiRequest<T>(path, { ...options, method: 'GET' })
  },
  post<T, Body = unknown>(path: string, body?: Body, options: Omit<ApiRequestOptions<Body>, 'method' | 'body'> = {}) {
    return apiRequest<T, Body>(path, { ...options, method: 'POST', body })
  },
  patch<T, Body = unknown>(path: string, body?: Body, options: Omit<ApiRequestOptions<Body>, 'method' | 'body'> = {}) {
    return apiRequest<T, Body>(path, { ...options, method: 'PATCH', body })
  },
  put<T, Body = unknown>(path: string, body?: Body, options: Omit<ApiRequestOptions<Body>, 'method' | 'body'> = {}) {
    return apiRequest<T, Body>(path, { ...options, method: 'PUT', body })
  },
  del<T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
    return apiRequest<T>(path, { ...options, method: 'DELETE' })
  },
}
