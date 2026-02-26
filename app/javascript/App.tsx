import React, { useEffect, useState } from 'react'
import MoviesTable from '@/components/MoviesTable'
import LoginPage from '@/components/LoginPage'
import SettingsPage from '@/components/SettingsPage'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'
type Page = 'movies' | 'settings'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#161b1f' }}>
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  )
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [page, setPage] = useState<Page>('movies')

  useEffect(() => {
    fetch('/api/me').then((r) =>
      setAuthState(r.ok ? 'authenticated' : 'unauthenticated')
    )
  }, [])

  if (authState === 'loading') return <LoadingScreen />
  if (authState === 'unauthenticated')
    return <LoginPage onLogin={() => setAuthState('authenticated')} />

  if (page === 'settings')
    return <SettingsPage onBack={() => setPage('movies')} />

  return (
    <MoviesTable
      onLogout={() => setAuthState('unauthenticated')}
      onSettings={() => setPage('settings')}
    />
  )
}
