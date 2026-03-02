import React, { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { getCsrfToken } from '@/lib/csrf'
import { isValidEmail } from '@/lib/utils'
import { TokenInput } from '@/components/ui/TokenInput'

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

type Tab = 'account' | 'servers'

export default function SettingsPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('account')
  const [servers, setServers] = useState<PlexServer[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', url: '', token: '' })
  const [newServer, setNewServer] = useState<EditState>({ name: '', url: '', token: '' })
  const [addingNew, setAddingNew] = useState(false)
  const [fetchingName, setFetchingName] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Account section
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailServerError, setEmailServerError] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    fetch('/api/me').then(async (r) => {
      if (r.ok) {
        const data = await r.json()
        setEmail(data.email_address ?? '')
      }
    })
  }, [])

  function handleEmailChange(value: string) {
    setEmail(value)
    setEmailSuccess(false)
    setEmailServerError(null)
    if (emailError && isValidEmail(value.trim())) setEmailError(null)
  }

  function handleEmailBlur() {
    const trimmed = email.trim()
    setEmail(trimmed)
    if (trimmed && !isValidEmail(trimmed)) setEmailError('Please enter a valid email address.')
    else setEmailError(null)
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    setEmail(trimmed)
    if (!isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError(null)
    setEmailServerError(null)
    setEmailSaving(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ user: { email_address: trimmed } }),
      })
      if (res.ok) {
        setEmailSuccess(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setEmailServerError((data as { errors?: string[] }).errors?.join(', ') ?? 'Failed to update email.')
      }
    } catch {
      setEmailServerError('Network error. Please try again.')
    } finally {
      setEmailSaving(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setPasswordError(null)
    setPasswordSuccess(false)
    setPasswordSaving(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ user: { password: newPassword, password_confirmation: confirmPassword } }),
      })
      if (res.ok) {
        setNewPassword('')
        setConfirmPassword('')
        setPasswordSuccess(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setPasswordError((data as { errors?: string[] }).errors?.join(', ') ?? 'Failed to update password.')
      }
    } catch {
      setPasswordError('Network error. Please try again.')
    } finally {
      setPasswordSaving(false)
    }
  }

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

  function tabClass(t: Tab) {
    const active = tab === t
    return [
      'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
      active
        ? 'border-[#E5A00D] text-[#E5A00D]'
        : 'border-transparent text-muted-foreground hover:text-foreground',
    ].join(' ')
  }

  return (
    <div>
      <PageHeader title="Settings" onBack={onBack} />

      {/* Tab bar */}
      <div className="flex justify-center">
        <button className={tabClass('account')} onClick={() => setTab('account')}>Account</button>
        <button className={tabClass('servers')} onClick={() => setTab('servers')}>Servers</button>
      </div>

      {/* Account tab */}
      {tab === 'account' && (
        <div className="px-8 py-6 space-y-6 max-w-2xl mx-auto">
          {/* Email */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Email address</h3>
            <div className="space-y-1">
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                required
                className="w-full border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
              {emailServerError && <p className="text-sm text-destructive">{emailServerError}</p>}
              {emailSuccess && <p className="text-sm text-green-500">Email updated.</p>}
            </div>
            <button type="submit" className="btn px-3 py-1.5 text-sm" disabled={emailSaving}>
              {emailSaving ? 'Saving…' : 'Update email'}
            </button>
          </form>

          {/* Password */}
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Change password</h3>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="new_password">New password</label>
                <input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordSuccess(false) }}
                  required
                  className="w-full border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="confirm_password">Confirm new password</label>
                <input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSuccess(false) }}
                  required
                  className="w-full border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-green-500">Password updated.</p>}
            </div>
            <button type="submit" className="btn px-3 py-1.5 text-sm" disabled={passwordSaving}>
              {passwordSaving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </div>
      )}

      {/* Servers tab */}
      {tab === 'servers' && (
        <div className="px-8 py-6 space-y-6 max-w-2xl mx-auto">
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
      )}
    </div>
  )
}
