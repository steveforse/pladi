import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import MoviesTable from '@/components/MoviesTable'
import ShowsTable from '@/components/ShowsTable'
import LoginPage from '@/components/LoginPage'
import SetupPage from '@/components/SetupPage'
import SettingsPage from '@/components/SettingsPage'
import HistoryPage from '@/components/HistoryPage'
import { api } from '@/lib/apiClient'
import { MeResponseSchema, SetupResponseSchema } from '@/lib/apiSchemas'
import type { z } from 'zod'
import type { SettingsTab } from '@/components/SettingsPage'
import type { ShowsViewMode } from '@/hooks/useShowsData'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'setup'
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
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

function AppContent() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [downloadImages, setDownloadImages] = useState(false)

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

  if (authState === 'loading') return <LoadingScreen />
  if (authState === 'setup')
    return <SetupPage onComplete={() => setAuthState('authenticated')} />

  if (authState === 'unauthenticated')
    return <LoginPage onLogin={() => setAuthState('authenticated')} />

  return (
    <AuthenticatedRoutes
      downloadImages={downloadImages}
      onDownloadImagesChange={setDownloadImages}
      onLogout={() => setAuthState('unauthenticated')}
    />
  )
}

function AuthenticatedRoutes({
  downloadImages,
  onDownloadImagesChange,
  onLogout,
}: {
  downloadImages: boolean
  onDownloadImagesChange: (value: boolean) => void
  onLogout: () => void
}) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/movies" replace />} />
      <Route path="/movies" element={<MoviesRoute downloadImages={downloadImages} onLogout={onLogout} />} />
      <Route path="/shows" element={<ShowsRoute downloadImages={downloadImages} onLogout={onLogout} />} />
      <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
      <Route path="/settings/:tab" element={<SettingsRoute downloadImages={downloadImages} onDownloadImagesChange={onDownloadImagesChange} onLogout={onLogout} />} />
      <Route path="/history" element={<HistoryRoute onLogout={onLogout} />} />
      <Route path="*" element={<Navigate to="/movies" replace />} />
    </Routes>
  )
}

type ParsedLibraryRoute = {
  routeServerId: number | null
  routeLibrary: string | null | undefined
  searchParamsKey: string
}

type SharedRouteState = { serverId: number | null; library: string | null }
const ALL_LIBRARIES_PARAM = 'all'

function parseLibraryRoute(searchParams: URLSearchParams): ParsedLibraryRoute {
  const routeServerIdRaw = Number(searchParams.get('server'))
  const routeServerId = Number.isFinite(routeServerIdRaw) && routeServerIdRaw > 0 ? routeServerIdRaw : null
  const routeLibraryParam = searchParams.get('library')
  const routeLibrary = !searchParams.has('library')
    ? undefined
    : routeLibraryParam === ALL_LIBRARIES_PARAM
      ? null
      : routeLibraryParam
  return {
    routeServerId,
    routeLibrary,
    searchParamsKey: searchParams.toString(),
  }
}

function applySharedLibraryParams(searchParamsKey: string, state: SharedRouteState): URLSearchParams {
  const next = new URLSearchParams(searchParamsKey)
  if (state.serverId) next.set('server', String(state.serverId))
  else next.delete('server')
  if (state.library === null) next.set('library', ALL_LIBRARIES_PARAM)
  else next.set('library', state.library)
  next.delete('type')
  return next
}

function MoviesRoute({
  downloadImages,
  onLogout,
}: {
  downloadImages: boolean
  onLogout: () => void
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { routeServerId, routeLibrary, searchParamsKey } = useMemo(() => parseLibraryRoute(searchParams), [searchParams])

  const handleRouteStateChange = useCallback(({ serverId, library }: { serverId: number | null; library: string | null }) => {
    const next = applySharedLibraryParams(searchParamsKey, { serverId, library })
    const nextKey = next.toString()
    if (nextKey !== searchParamsKey) setSearchParams(next, { replace: true })
  }, [searchParamsKey, setSearchParams])

  return (
    <MoviesTable
      onLogout={onLogout}
      onSettings={() => navigate('/settings/account')}
      onHistory={() => navigate('/history')}
      onShows={() => {
        const next = new URLSearchParams(searchParams)
        next.delete('type')
        next.delete('mode')
        navigate(`/shows?${next.toString()}`)
      }}
      downloadImages={downloadImages}
      routeServerId={routeServerId}
      routeLibrary={routeLibrary}
      onRouteStateChange={handleRouteStateChange}
    />
  )
}

function ShowsRoute({
  downloadImages,
  onLogout,
}: {
  downloadImages: boolean
  onLogout: () => void
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { routeServerId, routeLibrary, searchParamsKey } = useMemo(() => parseLibraryRoute(searchParams), [searchParams])
  const routeMode = searchParams.get('mode') === 'episodes' ? 'episodes' : 'shows'

  const handleRouteStateChange = useCallback(({ serverId, library, mode }: { serverId: number | null; library: string | null; mode: ShowsViewMode }) => {
    const next = applySharedLibraryParams(searchParamsKey, { serverId, library })
    next.set('mode', mode)
    const nextKey = next.toString()
    if (nextKey !== searchParamsKey) setSearchParams(next, { replace: true })
  }, [searchParamsKey, setSearchParams])

  return (
    <ShowsTable
      key={`shows-${routeMode}`}
      onMovies={() => {
        const next = new URLSearchParams(searchParams)
        next.delete('type')
        next.delete('mode')
        navigate(`/movies?${next.toString()}`)
      }}
      onLogout={onLogout}
      onSettings={() => navigate('/settings/account')}
      onHistory={() => navigate('/history')}
      downloadImages={downloadImages}
      initialViewMode={routeMode}
      routeServerId={routeServerId}
      routeLibrary={routeLibrary}
      onRouteStateChange={handleRouteStateChange}
    />
  )
}

function SettingsRoute({
  downloadImages,
  onDownloadImagesChange,
  onLogout,
}: {
  downloadImages: boolean
  onDownloadImagesChange: (value: boolean) => void
  onLogout: () => void
}) {
  const navigate = useNavigate()
  const { tab } = useParams()
  const activeTab: SettingsTab = tab === 'preferences' || tab === 'servers' ? tab : 'account'
  return (
    <SettingsPage
      onBack={() => navigate('/movies')}
      onLogout={onLogout}
      onSettings={() => navigate('/settings/account')}
      onHistory={() => navigate('/history')}
      activeTab={activeTab}
      onTabChange={(next) => navigate(`/settings/${next}`)}
      downloadImages={downloadImages}
      onDownloadImagesChange={onDownloadImagesChange}
    />
  )
}

function HistoryRoute({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate()
  return (
    <HistoryPage
      onBack={() => navigate('/movies')}
      onLogout={onLogout}
      onSettings={() => navigate('/settings/account')}
      onHistory={() => navigate('/history')}
    />
  )
}
