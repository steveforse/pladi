import React, { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import pladiLogo from '@/assets/pladi_logo.png'

function TokenInput({ value, onChange, onBlur, placeholder, className }: {
  value: string
  onChange: (v: string) => void
  onBlur?: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative flex items-center">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        placeholder={placeholder}
        className={`pr-8 ${className ?? ''}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
        aria-label={visible ? 'Hide token' : 'Show token'}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function getCsrfToken(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''
}

interface PlexServer {
  id: number
  name: string
  url: string
}

interface EditState {
  name: string
  url: string
  token: string
}

export default function SettingsPage({ onBack }: { onBack: () => void }) {
  const [servers, setServers] = useState<PlexServer[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', url: '', token: '' })
  const [newServer, setNewServer] = useState<EditState>({ name: '', url: '', token: '' })
  const [addingNew, setAddingNew] = useState(false)
  const [fetchingName, setFetchingName] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchName(url: string, token: string) {
    const trimmedUrl = url.trim()
    const trimmedToken = token.trim()
    if (!trimmedUrl || !trimmedToken) return
    setFetchingName(true)
    try {
      const res = await fetch(
        `/api/plex_servers/lookup_name?url=${encodeURIComponent(trimmedUrl)}&token=${encodeURIComponent(trimmedToken)}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.name) setNewServer((s) => ({ ...s, name: data.name }))
      }
    } finally {
      setFetchingName(false)
    }
  }

  async function fetchServers() {
    const res = await fetch('/api/plex_servers')
    if (res.ok) {
      setServers(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchServers()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await fetch('/api/plex_servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
      body: JSON.stringify({ plex_server: { ...newServer, token: newServer.token.trim() } }),
    })
    if (res.ok) {
      setNewServer({ name: '', url: '', token: '' })
      setAddingNew(false)
      fetchServers()
    } else {
      const data = await res.json()
      setError(data.errors?.join(', ') ?? 'Failed to create server')
    }
  }

  function startEdit(server: PlexServer) {
    setEditingId(server.id)
    setEditState({ name: server.name, url: server.url, token: '' })
  }

  async function handleUpdate(e: React.FormEvent, id: number) {
    e.preventDefault()
    setError(null)
    const res = await fetch(`/api/plex_servers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
      body: JSON.stringify({ plex_server: { ...editState, token: editState.token.trim() } }),
    })
    if (res.ok) {
      setEditingId(null)
      fetchServers()
    } else {
      const data = await res.json()
      setError(data.errors?.join(', ') ?? 'Failed to update server')
    }
  }

  async function handleDelete(id: number) {
    setError(null)
    const res = await fetch(`/api/plex_servers/${id}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': getCsrfToken() },
    })
    if (res.ok) {
      fetchServers()
    } else {
      setError('Failed to delete server')
    }
  }

  return (
    <div className="space-y-4">
      {/* Title bar */}
      <div className="flex items-center gap-4 px-4 py-2" style={{ backgroundColor: '#1e2730' }}>
        <div className="flex items-center gap-3">
          <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
        </div>
        <span className="text-muted-foreground text-sm ml-2">/ Settings</span>
        <div className="flex-1" />
        <button onClick={onBack} className="btn px-3 py-1.5 text-sm">
          ← Back
        </button>
      </div>

      <div className="px-8 space-y-6">
        <h2 className="text-lg font-semibold">Plex Servers</h2>

        {error && (
          <div className="text-sm text-destructive border border-destructive/30 rounded px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            {servers.length > 0 && (
              <div className="rounded-md border overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">URL</th>
                      <th className="px-4 py-3 text-left font-medium w-40">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servers.map((server) =>
                      editingId === server.id ? (
                        <tr key={server.id} className="border-b last:border-0">
                          <td className="px-4 py-2" colSpan={3}>
                            <form onSubmit={(e) => handleUpdate(e, server.id)} className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                value={editState.name}
                                onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                                placeholder="Name"
                                required
                                className="border rounded px-2 py-1 text-sm bg-background w-40"
                              />
                              <input
                                type="url"
                                value={editState.url}
                                onChange={(e) => setEditState((s) => ({ ...s, url: e.target.value }))}
                                placeholder="URL"
                                required
                                className="border rounded px-2 py-1 text-sm bg-background w-56"
                              />
                              <TokenInput
                                value={editState.token}
                                onChange={(v) => setEditState((s) => ({ ...s, token: v }))}
                                placeholder="Token (leave blank to keep)"
                                className="border rounded px-2 py-1 text-sm bg-background w-52"
                              />
                              <button type="submit" className="btn px-3 py-1 text-sm">Save</button>
                              <button type="button" onClick={() => setEditingId(null)} className="btn px-3 py-1 text-sm text-muted-foreground">Cancel</button>
                            </form>
                          </td>
                        </tr>
                      ) : (
                        <tr key={server.id} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
                          <td className="px-4 py-2 font-medium">{server.name}</td>
                          <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{server.url}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(server)} className="btn px-2 py-1 text-xs">Edit</button>
                              <button onClick={() => handleDelete(server.id)} className="btn px-2 py-1 text-xs text-destructive hover:bg-destructive/10">Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {servers.length === 0 && !addingNew && (
              <p className="text-sm text-muted-foreground">No Plex servers configured yet.</p>
            )}

            {addingNew ? (
              <form onSubmit={handleCreate} className="space-y-3">
                <h3 className="text-sm font-semibold">Add Server</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="url"
                    value={newServer.url}
                    onChange={(e) => setNewServer((s) => ({ ...s, url: e.target.value }))}
                    onBlur={(e) => fetchName(e.target.value, newServer.token)}
                    placeholder="URL (e.g. https://plex.example.com)"
                    required
                    className="border rounded px-2 py-1 text-sm bg-background w-72"
                  />
                  <TokenInput
                    value={newServer.token}
                    onChange={(v) => setNewServer((s) => ({ ...s, token: v }))}
                    onBlur={(v) => fetchName(newServer.url, v)}
                    placeholder="Plex token"
                    className="border rounded px-2 py-1 text-sm bg-background w-52"
                  />
                  <input
                    type="text"
                    value={newServer.name}
                    onChange={(e) => setNewServer((s) => ({ ...s, name: e.target.value }))}
                    placeholder={fetchingName ? 'Fetching name…' : 'Name (e.g. Home Server)'}
                    required
                    className="border rounded px-2 py-1 text-sm bg-background w-48"
                  />
                  <button type="submit" className="btn px-3 py-1.5 text-sm">Add</button>
                  <button type="button" onClick={() => setAddingNew(false)} className="btn px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setAddingNew(true)} className="btn px-3 py-1.5 text-sm">
                + Add Server
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
