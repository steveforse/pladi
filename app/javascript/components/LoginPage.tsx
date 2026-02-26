import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import pladiLogo from '@/assets/pladi_logo.png'

function getCsrfToken(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''
}

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ email_address: emailAddress, password }),
      })
      if (res.ok) {
        onLogin()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Invalid credentials')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#161b1f' }}>
      <div className="w-full max-w-sm rounded-xl border p-8 space-y-6" style={{ backgroundColor: '#1e2429', borderColor: '#2e3740' }}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <img src={pladiLogo} alt="Pladi logo" className="h-[72px] w-auto" />
          <span className="text-4xl font-bold tracking-wide" style={{ color: '#E5A00D' }}>Pladi</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="email_address">
              Email address
            </label>
            <input
              id="email_address"
              type="email"
              autoComplete="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              required
              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
