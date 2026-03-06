import React from 'react'

export default function AccountSettingsSection({
  email,
  emailError,
  emailServerError,
  emailSuccess,
  emailSaving,
  onEmailChange,
  onEmailBlur,
  onEmailSubmit,
  newPassword,
  confirmPassword,
  passwordError,
  passwordSuccess,
  passwordSaving,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onPasswordSubmit,
}: {
  email: string
  emailError: string | null
  emailServerError: string | null
  emailSuccess: boolean
  emailSaving: boolean
  onEmailChange: (value: string) => void
  onEmailBlur: () => void
  onEmailSubmit: (event: React.FormEvent) => Promise<void>
  newPassword: string
  confirmPassword: string
  passwordError: string | null
  passwordSuccess: boolean
  passwordSaving: boolean
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onPasswordSubmit: (event: React.FormEvent) => Promise<void>
}) {
  return (
    <div className="px-8 py-6 space-y-6 max-w-2xl mx-auto">
      <form onSubmit={onEmailSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Email address</h3>
        <div className="space-y-1">
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            onBlur={onEmailBlur}
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

      <form onSubmit={onPasswordSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Change password</h3>
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="new_password">New password</label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => onNewPasswordChange(event.target.value)}
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
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
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
  )
}
