import React, { useEffect, useState } from 'react'
import MoviesTable from '@/components/MoviesTable'
import LoginPage from '@/components/LoginPage'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#161b1f' }}>
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  )
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    fetch('/api/me').then((r) =>
      setAuthState(r.ok ? 'authenticated' : 'unauthenticated')
    )
  }, [])

  if (authState === 'loading') return <LoadingScreen />
  if (authState === 'unauthenticated')
    return <LoginPage onLogin={() => setAuthState('authenticated')} />
  return <MoviesTable onLogout={() => setAuthState('unauthenticated')} />
}
