import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useHistory, AuditLog } from '@/hooks/useHistory'

function formatValue(log: AuditLog, which: 'old' | 'new') {
  const raw = which === 'old' ? log.old_value : log.new_value
  if (raw === null || raw === undefined) return <span className="text-muted-foreground italic">—</span>
  if (log.field_type === 'tag') {
    try {
      const arr: string[] = JSON.parse(raw)
      return arr.length > 0 ? arr.join(', ') : <span className="text-muted-foreground italic">—</span>
    } catch {
      return raw
    }
  }
  return raw || <span className="text-muted-foreground italic">—</span>
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function FieldLabel({ name }: { name: string }) {
  return (
    <span className="font-mono text-xs bg-muted/40 rounded px-1 py-0.5">
      {name.replace(/_/g, ' ')}
    </span>
  )
}

export default function HistoryPage({ onBack }: { onBack: () => void }) {
  const { logs, loading, error } = useHistory()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#161b1f' }}>
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="btn px-2 py-1.5" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Edit History</h1>
      </header>

      <main className="p-4">
        {loading && (
          <div className="text-muted-foreground text-center py-16 animate-pulse">Loading…</div>
        )}

        {error && (
          <div className="text-destructive text-center py-16">Error: {error}</div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="text-muted-foreground text-center py-16">No edit history yet.</div>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-muted-foreground text-left">
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Timestamp</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Server</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Section</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Movie</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Field</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Old Value</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">New Value</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{log.plex_server.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{log.section_title}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium">{log.movie_title}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <FieldLabel name={log.field_name} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">
                      {formatValue(log, 'old')}
                    </td>
                    <td className="px-3 py-2 text-foreground max-w-xs truncate">
                      {formatValue(log, 'new')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
