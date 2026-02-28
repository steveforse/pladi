import React, { useState } from 'react'
import pladiLogo from '@/assets/pladi_logo.png'
import { getCsrfToken } from '@/lib/csrf'
import { TokenInput } from '@/components/ui/TokenInput'
import type { PlexServerInfo } from '@/lib/types'

export function WelcomeScreen({
  onLogout,
  onServerAdded,
}: {
  onLogout: () => void
  onServerAdded: (server: PlexServerInfo) => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [fetchingName, setFetchingName] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchName(currentUrl: string, currentToken: string) {
    const trimmedUrl = currentUrl.trim()
    const trimmedToken = currentToken.trim()
    if (!trimmedUrl || !trimmedToken) return
    setFetchingName(true)
    try {
      const res = await fetch(
        `/api/plex_servers/lookup_name?url=${encodeURIComponent(trimmedUrl)}&token=${encodeURIComponent(trimmedToken)}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.name) setName(data.name)
      }
    } finally {
      setFetchingName(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/plex_servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ plex_server: { name, url, token: token.trim() } }),
      })
      if (res.ok) {
        const server: PlexServerInfo = await res.json()
        onServerAdded(server)
      } else {
        const data = await res.json()
        setError(data.errors?.join(', ') ?? 'Something went wrong.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#161b1f' }}>
      {/* Title bar */}
      <div className="flex items-center gap-4 px-4 py-2" style={{ backgroundColor: '#1e2730' }}>
        <div className="flex items-center gap-3">
          <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
        </div>
        <div className="flex-1" />
        <button
          onClick={async () => {
            await fetch('/session', { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() } })
            onLogout()
          }}
          className="btn px-3 py-1.5 text-sm text-muted-foreground"
        >
          Sign out
        </button>
      </div>

      {/* Welcome card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Welcome to PLADI</h2>
            <p className="text-muted-foreground text-sm">
              Connect your first Plex server to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="border rounded-lg p-6 space-y-4 bg-card">
            <div className="space-y-1">
              <label className="text-sm font-medium">Server URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={(e) => fetchName(e.target.value, token)}
                placeholder="https://plex.example.com"
                required
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Plex token</label>
              <TokenInput
                value={token}
                onChange={setToken}
                onBlur={(v) => fetchName(url, v)}
                placeholder="Your Plex auth token"
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Server name
                {fetchingName && <span className="ml-2 text-xs text-muted-foreground font-normal">Fetching…</span>}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Home Server"
                required
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn w-full py-2 text-sm font-medium justify-center"
              style={{ backgroundColor: '#E5A00D', color: '#000', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Connecting…' : 'Connect server'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
