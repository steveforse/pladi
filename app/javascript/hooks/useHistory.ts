import { useEffect, useState } from 'react'
import { ApiError, api } from '@/lib/apiClient'
import { AuditLogListSchema } from '@/lib/apiSchemas'

export interface AuditLog {
  id: number
  field_name: string
  field_type: 'scalar' | 'tag'
  old_value: string | null
  new_value: string | null
  created_at: string
  media_type: string
  media_id: string
  media_title: string
  section_title: string
  plex_server: { id: number; name: string }
}

export function useHistory() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<AuditLog[]>('/api/history', { responseSchema: AuditLogListSchema })
      .then((res) => setLogs(res.data ?? []))
      .catch((e: unknown) => {
        if (e instanceof ApiError) setError(e.message)
        else setError(e instanceof Error ? e.message : 'Unknown error')
      })
      .finally(() => setLoading(false))
  }, [])

  return { logs, loading, error }
}
