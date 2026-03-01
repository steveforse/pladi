import React, { useEffect, useState } from 'react'
import MoviesTable from '@/components/MoviesTable'
import LoginPage from '@/components/LoginPage'
import SettingsPage from '@/components/SettingsPage'
import HistoryPage from '@/components/HistoryPage'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'
type Page = 'movies' | 'settings' | 'history'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#161b1f' }}>
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  )
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [page, setPage] = useState<Page>(() => (window.history.state?.page as Page) ?? 'movies')

  useEffect(() => {
    // Ensure the initial history entry has page state so popstate can restore it
    window.history.replaceState({ page }, '')
  }, [])

  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      setPage((e.state?.page as Page) ?? 'movies')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    fetch('/api/me').then((r) =>
      setAuthState(r.ok ? 'authenticated' : 'unauthenticated')
    )
  }, [])

  function navigateTo(newPage: Page) {
    window.history.pushState({ page: newPage }, '')
    setPage(newPage)
  }

  if (authState === 'loading') return <LoadingScreen />
  if (authState === 'unauthenticated')
    return <LoginPage onLogin={() => setAuthState('authenticated')} />

  if (page === 'settings')
    return <SettingsPage onBack={() => window.history.back()} />

  if (page === 'history')
    return <HistoryPage onBack={() => window.history.back()} />

  return (
    <MoviesTable
      onLogout={() => setAuthState('unauthenticated')}
      onSettings={() => navigateTo('settings')}
      onHistory={() => navigateTo('history')}
    />
  )
}
