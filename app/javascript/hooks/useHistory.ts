import { useEffect, useState } from 'react'

export interface AuditLog {
  id: number
  field_name: string
  field_type: 'scalar' | 'tag'
  old_value: string | null
  new_value: string | null
  created_at: string
  movie_id: string
  movie_title: string
  section_title: string
  plex_server: { id: number; name: string }
}

export function useHistory() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/history')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => setLogs(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { logs, loading, error }
}
