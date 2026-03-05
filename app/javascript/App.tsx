import React, { useEffect, useState } from 'react'
import MoviesTable from '@/components/MoviesTable'
import ShowsTable from '@/components/ShowsTable'
import LoginPage from '@/components/LoginPage'
import SetupPage from '@/components/SetupPage'
import SettingsPage from '@/components/SettingsPage'
import HistoryPage from '@/components/HistoryPage'
import { api } from '@/lib/apiClient'
import { MeResponseSchema, SetupResponseSchema } from '@/lib/apiSchemas'
import type { z } from 'zod'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'setup'
type Page = 'movies' | 'shows' | 'settings' | 'history'
type MeResponse = z.infer<typeof MeResponseSchema>
type SetupResponse = z.infer<typeof SetupResponseSchema>

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
    const controller = new AbortController()

    async function bootstrapAuth() {
      try {
        const meRes = await api.get<MeResponse>('/api/me', {
          signal: controller.signal,
          throwOnError: false,
          responseSchema: MeResponseSchema,
        })
        if (meRes.ok && meRes.data) {
          const data = meRes.data
          setDownloadImages(data.download_images ?? false)
          setAuthState('authenticated')
          return
        }

        const setupRes = await api.get<SetupResponse>('/api/setup', {
          signal: controller.signal,
          throwOnError: false,
          responseSchema: SetupResponseSchema,
        })
        setAuthState(setupRes.data?.needed ? 'setup' : 'unauthenticated')
      } catch {
        if (controller.signal.aborted) return
        setAuthState('unauthenticated')
      }
    }

    bootstrapAuth()
    return () => controller.abort()
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

  if (page === 'shows')
    return (
      <ShowsTable
        onMovies={() => navigateTo('movies')}
        onLogout={() => setAuthState('unauthenticated')}
        onSettings={() => navigateTo('settings')}
        onHistory={() => navigateTo('history')}
      />
    )

  return (
    <MoviesTable
      onLogout={() => setAuthState('unauthenticated')}
      onSettings={() => navigateTo('settings')}
      onHistory={() => navigateTo('history')}
      onShows={() => navigateTo('shows')}
      downloadImages={downloadImages}
    />
  )
}
