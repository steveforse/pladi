import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import pladiLogo from '@/assets/pladi_logo.png'
import { getCsrfToken } from '@/lib/csrf'
import { isValidEmail } from '@/lib/utils'

export default function SetupPage({ onComplete }: { onComplete: () => void }) {
  const [emailAddress, setEmailAddress] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function handleEmailChange(value: string) {
    setEmailAddress(value)
    if (emailError && isValidEmail(value.trim())) setEmailError(null)
  }

  function handleEmailBlur() {
    const trimmed = emailAddress.trim()
    setEmailAddress(trimmed)
    if (trimmed && !isValidEmail(trimmed)) setEmailError('Please enter a valid email address.')
    else setEmailError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedEmail = emailAddress.trim()
    setEmailAddress(trimmedEmail)

    const clientErrors: string[] = []

    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address.')
      clientErrors.push('email')
    }
    if (password.length < 1) clientErrors.push('Password is required.')
    if (password !== passwordConfirmation) clientErrors.push('Passwords do not match.')

    const formErrors = clientErrors.filter((e) => e !== 'email')
    if (clientErrors.length > 0) {
      setErrors(formErrors)
      return
    }

    setErrors([])
    setLoading(true)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ user: { email_address: trimmedEmail, password, password_confirmation: passwordConfirmation } }),
      })
      if (res.ok) {
        onComplete()
      } else {
        const data = await res.json().catch(() => ({}))
        const msgs: string[] = (data as { errors?: string[]; error?: string }).errors
          ?? [(data as { error?: string }).error ?? 'Something went wrong.']
        setErrors(msgs)
      }
    } catch {
      setErrors(['Network error. Please try again.'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#161b1f' }}>
      <div className="w-full max-w-sm rounded-xl border p-8 space-y-6" style={{ backgroundColor: '#1e2429', borderColor: '#2e3740' }}>
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <img src={pladiLogo} alt="Pladi logo" className="h-[72px] w-auto" />
          <span className="text-4xl font-bold tracking-wide" style={{ color: '#E5A00D' }}>PLADI</span>
        </div>

        {/* Welcome */}
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold text-foreground">Welcome to Pladi!</p>
          <p className="text-sm text-muted-foreground">Create your account to get started.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="setup_email">
              Email address
            </label>
            <input
              id="setup_email"
              type="email"
              autoComplete="email"
              value={emailAddress}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              required
              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="setup_password">
              Password
            </label>
            <input
              id="setup_password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="setup_password_confirmation">
              Confirm password
            </label>
            <input
              id="setup_password_confirmation"
              type="password"
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {errors.length > 0 && (
            <ul className="space-y-1">
              {errors.map((err) => (
                <li key={err} className="text-sm text-destructive">{err}</li>
              ))}
            </ul>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </div>
    </div>
  )
}
