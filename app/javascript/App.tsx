import React, { useEffect, useState } from 'react'
import MoviesTable from '@/components/MoviesTable'
import LoginPage from '@/components/LoginPage'
import SetupPage from '@/components/SetupPage'
import SettingsPage from '@/components/SettingsPage'
import HistoryPage from '@/components/HistoryPage'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'setup'
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
  const [downloadImages, setDownloadImages] = useState(false)

  useEffect(() => {
    // Ensure the initial history entry has page state so popstate can restore it
    const initialPage = (window.history.state?.page as Page) ?? 'movies'
    window.history.replaceState({ page: initialPage }, '')
  }, [])

  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      setPage((e.state?.page as Page) ?? 'movies')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    fetch('/api/me').then(async (r) => {
      if (r.ok) {
        const data = await r.json()
        setDownloadImages((data as { download_images: boolean }).download_images ?? false)
        setAuthState('authenticated')
      } else {
        const setupRes = await fetch('/api/setup')
        const setupData = await setupRes.json().catch(() => ({ needed: false }))
        setAuthState((setupData as { needed: boolean }).needed ? 'setup' : 'unauthenticated')
      }
    })
  }, [])

  function navigateTo(newPage: Page) {
    window.history.pushState({ page: newPage }, '')
    setPage(newPage)
  }

  if (authState === 'loading') return <LoadingScreen />
  if (authState === 'setup')
    return <SetupPage onComplete={() => setAuthState('authenticated')} />

  if (authState === 'unauthenticated')
    return <LoginPage onLogin={() => setAuthState('authenticated')} />

  if (page === 'settings')
    return <SettingsPage onBack={() => window.history.back()} downloadImages={downloadImages} onDownloadImagesChange={setDownloadImages} />

  if (page === 'history')
    return <HistoryPage onBack={() => window.history.back()} />

  return (
    <MoviesTable
      onLogout={() => setAuthState('unauthenticated')}
      onSettings={() => navigateTo('settings')}
      onHistory={() => navigateTo('history')}
      downloadImages={downloadImages}
    />
  )
}
