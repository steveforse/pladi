import { useCallback, useEffect, useRef, useState } from 'react'
import { createConsumer } from '@rails/actioncable'
import type { Movie, PlexServerInfo, Section } from '@/lib/types'
import { ENRICHMENT_FIELDS, mergeEnrichmentCache, saveEnrichmentCacheDelta, updateEnrichmentCacheMovie, savePosterReadyCache, loadPosterReadyCache, saveBackgroundReadyCache, loadBackgroundReadyCache } from '@/lib/enrichmentCache'
import { ApiError, api } from '@/lib/apiClient'
import { EnrichResponseSchema, SectionListSchema, MovieDetailSchema } from '@/lib/apiSchemas'
import { mergeEnrichedRows, normalizeTagPatch, resolveInitialLibrary } from '@/hooks/libraryDataUtils'
import { usePlexServerBootstrap } from '@/hooks/usePlexServerBootstrap'
import type { z } from 'zod'

type PosterMovie = { id: string; thumb: string }
type BackgroundMovie = { id: string; art: string }
type MediaRowIdentity = Pick<Movie, 'id' | 'file_path'>
type EnrichResponse = z.infer<typeof EnrichResponseSchema>

const STORAGE_KEYS = {
  serverId: 'pladi_selected_server_id',
  library: 'pladi_selected_library',
}

export function useMoviesData(downloadImages: boolean) {
  const [plexServers, setPlexServers] = useState<PlexServerInfo[]>([])
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posterReady, setPosterReady] = useState<Set<string>>(new Set())
  const [uncachedPosterMovies, setUncachedPosterMovies] = useState<PosterMovie[]>([])
  const [backgroundReady, setBackgroundReady] = useState<Set<string>>(new Set())
  const [uncachedBackgroundMovies, setUncachedBackgroundMovies] = useState<BackgroundMovie[]>([])
  const consumerRef = useRef<ReturnType<typeof createConsumer> | null>(null)
  const loadRequestIdRef = useRef(0)
  const activeLoadAbortRef = useRef<AbortController | null>(null)
  const handleBootstrapError = useCallback((message: string) => {
    setError(message)
    setLoading(false)
    setSyncing(false)
  }, [])
  const handleNoServers = useCallback(() => {
    setLoading(false)
    setSyncing(false)
  }, [])
  const abortActiveLoad = useCallback(() => {
    activeLoadAbortRef.current?.abort()
  }, [])

  // Create Action Cable consumer once on mount, disconnect on unmount
  useEffect(() => {
    consumerRef.current = createConsumer()
    return () => {
      activeLoadAbortRef.current?.abort()
      consumerRef.current?.disconnect()
    }
  }, [])

  // Subscribe to PostersChannel whenever selectedServerId changes
  useEffect(() => {
    if (!downloadImages || !selectedServerId || !consumerRef.current) return
    setPosterReady(loadPosterReadyCache(selectedServerId))
    const sub = consumerRef.current.subscriptions.create(
      { channel: 'PostersChannel', server_id: selectedServerId },
      { received(data: { media_id: string }) {
          setPosterReady((prev) => new Set([...prev, data.media_id]))
      }}
    )
    return () => sub.unsubscribe()
  }, [selectedServerId, downloadImages])

  // Subscribe to BackgroundsChannel whenever selectedServerId changes
  useEffect(() => {
    if (!downloadImages || !selectedServerId || !consumerRef.current) return
    setBackgroundReady(loadBackgroundReadyCache(selectedServerId))
    const sub = consumerRef.current.subscriptions.create(
      { channel: 'BackgroundsChannel', server_id: selectedServerId },
      { received(data: { media_id: string }) {
          setBackgroundReady((prev) => new Set([...prev, data.media_id]))
      }}
    )
    return () => sub.unsubscribe()
  }, [selectedServerId, downloadImages])

  const loadMovies = useCallback(async (serverId: number) => {
    const requestId = loadRequestIdRef.current + 1
    loadRequestIdRef.current = requestId
    activeLoadAbortRef.current?.abort()
    const controller = new AbortController()
    activeLoadAbortRef.current = controller
    const { signal } = controller
    const isStale = () => loadRequestIdRef.current !== requestId

    setLoading(true)
    setError(null)
    setSections([])
    setSelectedTitle(null)
    if (downloadImages) {
      setPosterReady(loadPosterReadyCache(serverId))
      setBackgroundReady(loadBackgroundReadyCache(serverId))
    }
    try {
      const listRes = await api.get<Section[]>('/api/movies', {
        signal,
        query: { server_id: serverId },
        responseSchema: SectionListSchema,
      })
      const data = listRes.data ?? []
      if (isStale()) return
      setSections(await mergeEnrichmentCache(serverId, data))
      if (data.length > 0) {
        setSelectedTitle(resolveInitialLibrary(data, STORAGE_KEYS.library))
      }
      setLoading(false)

      // Refresh section list from Plex
      setRefreshing(true)
      try {
        const refreshRes = await api.get<Section[]>('/api/movies/refresh', {
          signal,
          query: { server_id: serverId },
          throwOnError: false,
          responseSchema: SectionListSchema,
        })
        if (isStale()) return
        if (refreshRes.ok && refreshRes.data) {
          const fresh = refreshRes.data
          setSections(await mergeEnrichmentCache(serverId, fresh))
          setSelectedTitle((prev) =>
            prev === null || fresh.some((s) => s.title === prev)
              ? prev
              : (fresh[0]?.title ?? null)
          )
        }
      } finally {
        if (!isStale()) setRefreshing(false)
      }

      // Enrich with per-movie metadata
      setSyncing(true)
      try {
        const enrichRes = await api.get<EnrichResponse>('/api/movies/enrich', {
          signal,
          query: { server_id: serverId },
          throwOnError: false,
          responseSchema: EnrichResponseSchema,
        })
        if (isStale()) return
        if (enrichRes.ok && enrichRes.data) {
          const enrichData = enrichRes.data
          if (isStale()) return
          setSections((prev) => {
            const mergedSections = mergeEnrichedRows({
              previousSections: prev,
              enrichedSections: enrichData.sections as Section[],
              fields: ENRICHMENT_FIELDS,
            })
            void saveEnrichmentCacheDelta(serverId, mergedSections, prev)
            return mergedSections
          })
          if (downloadImages) {
            if (enrichData.cached_poster_media_ids?.length) {
              savePosterReadyCache(serverId, enrichData.cached_poster_media_ids)
              setPosterReady((prev) => {
                const next = new Set(prev)
                for (const id of enrichData.cached_poster_media_ids) next.add(id)
                return next
              })
            }
            setUncachedPosterMovies(enrichData.uncached_poster_items ?? [])
            if (enrichData.cached_background_media_ids?.length) {
              saveBackgroundReadyCache(serverId, enrichData.cached_background_media_ids)
              setBackgroundReady((prev) => {
                const next = new Set(prev)
                for (const id of enrichData.cached_background_media_ids) next.add(id)
                return next
              })
            }
            setUncachedBackgroundMovies(enrichData.uncached_background_items ?? [])
          }
        }
      } finally {
        if (!isStale()) setSyncing(false)
      }
    } catch (err: unknown) {
      if (signal.aborted || isStale()) return
      if (err instanceof ApiError) setError(err.message)
      else setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    } finally {
      if (activeLoadAbortRef.current === controller) {
        activeLoadAbortRef.current = null
      }
    }
  }, [downloadImages])

  const handleSelectServer = useCallback(async (serverId: number) => {
    setSelectedServerId(serverId)
    await loadMovies(serverId)
  }, [loadMovies])

  usePlexServerBootstrap({
    storageKey: STORAGE_KEYS.serverId,
    onServersLoaded: setPlexServers,
    onSelectServer: handleSelectServer,
    onNoServers: handleNoServers,
    onError: handleBootstrapError,
    abortActiveLoad,
  })

  function handleServerChange(id: number) {
    localStorage.setItem(STORAGE_KEYS.serverId, String(id))
    setSelectedServerId(id)
    loadMovies(id)
  }

  function handleLibraryChange(title: string | null) {
    if (title !== null) localStorage.setItem(STORAGE_KEYS.library, title)
    setSelectedTitle(title)
  }

  function handleServerAdded(server: PlexServerInfo) {
    setPlexServers([server])
    setSelectedServerId(server.id)
    loadMovies(server.id)
  }

  async function updateMovie(movieId: string, patch: Partial<Movie>) {
    if (!selectedServerId) throw new Error('No server selected')

    const apiPatch = normalizeTagPatch(patch as Record<string, unknown>)

    await api.patch<unknown, { movie: Record<string, unknown> }>(
      `/api/movies/${movieId}`,
      { movie: apiPatch },
      { query: { server_id: selectedServerId }, csrf: true }
    )
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((m) => (m.id === movieId ? { ...m, ...patch } : m)),
      }))
    )
    if (selectedServerId) void updateEnrichmentCacheMovie(selectedServerId, movieId, patch)
  }

  async function refreshMovies(rows: MediaRowIdentity[]) {
    if (!selectedServerId) return
    await Promise.all(rows.map(async ({ id, file_path: filePath }) => {
      const detailRes = await api.get<Partial<Movie>>(`/api/movies/${id}`, {
        query: { server_id: selectedServerId, file_path: filePath },
        throwOnError: false,
        responseSchema: MovieDetailSchema,
      })
      if (!detailRes.ok || !detailRes.data) return
      const detail = detailRes.data
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          items: section.items.map((m) => (m.id === id && m.file_path === filePath ? { ...m, ...detail } : m)),
        }))
      )
      void updateEnrichmentCacheMovie(selectedServerId, id, detail)
    }))
  }

  async function warmPosters(priorityIds: string[]) {
    if (!downloadImages || !selectedServerId || uncachedPosterMovies.length === 0) return
    await api.post<unknown, { priority_ids: string[]; movies: PosterMovie[] }>(
      '/api/movies/warm_posters',
      { priority_ids: priorityIds, movies: uncachedPosterMovies },
      { query: { server_id: selectedServerId }, csrf: true, throwOnError: false }
    )
  }

  async function warmBackgrounds(priorityIds: string[]) {
    if (!downloadImages || !selectedServerId || uncachedBackgroundMovies.length === 0) return
    await api.post<unknown, { priority_ids: string[]; movies: BackgroundMovie[] }>(
      '/api/movies/warm_backgrounds',
      { priority_ids: priorityIds, movies: uncachedBackgroundMovies },
      { query: { server_id: selectedServerId }, csrf: true, throwOnError: false }
    )
  }

  return {
    plexServers,
    selectedServerId,
    sections,
    selectedTitle,
    loading,
    refreshing,
    syncing,
    error,
    posterReady,
    uncachedPosterMovies,
    backgroundReady,
    uncachedBackgroundMovies,
    handleServerChange,
    handleServerAdded,
    setSelectedTitle: handleLibraryChange,
    warmPosters,
    warmBackgrounds,
    updateMovie,
    refreshMovies,
  }
}
