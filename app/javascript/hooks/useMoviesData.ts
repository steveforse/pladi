import { useEffect, useRef, useState } from 'react'
import { createConsumer } from '@rails/actioncable'
import type { Movie, PlexServerInfo, Section } from '@/lib/types'
import { ENRICHMENT_FIELDS, mergeEnrichmentCache, saveEnrichmentCache, updateEnrichmentCacheMovie, savePosterReadyCache, loadPosterReadyCache, saveBackgroundReadyCache, loadBackgroundReadyCache } from '@/lib/enrichmentCache'
import { ApiError, api } from '@/lib/apiClient'
import { EnrichResponseSchema, PlexServerInfoListSchema, SectionListSchema, MovieDetailSchema } from '@/lib/apiSchemas'
import { mergeEnrichedRows, normalizeTagPatch, resolveInitialLibrary, resolveInitialServerId } from '@/hooks/libraryDataUtils'
import type { z } from 'zod'

type PosterMovie = { id: string; thumb: string }
type BackgroundMovie = { id: string; art: string }
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
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posterReady, setPosterReady] = useState<Set<string>>(new Set())
  const [uncachedPosterMovies, setUncachedPosterMovies] = useState<PosterMovie[]>([])
  const [backgroundReady, setBackgroundReady] = useState<Set<string>>(new Set())
  const [uncachedBackgroundMovies, setUncachedBackgroundMovies] = useState<BackgroundMovie[]>([])
  const consumerRef = useRef<ReturnType<typeof createConsumer> | null>(null)
  const loadRequestIdRef = useRef(0)
  const activeLoadAbortRef = useRef<AbortController | null>(null)

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
      { received(data: { movie_id: string }) {
          setPosterReady((prev) => new Set([...prev, data.movie_id]))
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
      { received(data: { movie_id: string }) {
          setBackgroundReady((prev) => new Set([...prev, data.movie_id]))
      }}
    )
    return () => sub.unsubscribe()
  }, [selectedServerId, downloadImages])

  async function loadMovies(serverId: number) {
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
      setSections(mergeEnrichmentCache(serverId, data))
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
          setSections(mergeEnrichmentCache(serverId, fresh))
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
          saveEnrichmentCache(serverId, enrichData.sections)
          setSections((prev) => mergeEnrichedRows({
            previousSections: prev,
            enrichedSections: enrichData.sections as Section[],
            fields: ENRICHMENT_FIELDS,
          }))
          if (downloadImages) {
            if (enrichData.cached_poster_ids?.length) {
              savePosterReadyCache(serverId, enrichData.cached_poster_ids)
              setPosterReady((prev) => {
                const next = new Set(prev)
                for (const id of enrichData.cached_poster_ids) next.add(id)
                return next
              })
            }
            setUncachedPosterMovies(enrichData.uncached_poster_movies ?? [])
            if (enrichData.cached_background_ids?.length) {
              saveBackgroundReadyCache(serverId, enrichData.cached_background_ids)
              setBackgroundReady((prev) => {
                const next = new Set(prev)
                for (const id of enrichData.cached_background_ids) next.add(id)
                return next
              })
            }
            setUncachedBackgroundMovies(enrichData.uncached_background_movies ?? [])
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
  }

  // Fetch servers on mount, then load movies for the first server
  useEffect(() => {
    const controller = new AbortController()

    const init = async () => {
      try {
        const serversRes = await api.get<PlexServerInfo[]>('/api/plex_servers', {
          signal: controller.signal,
          responseSchema: PlexServerInfoListSchema,
        })
        const servers = serversRes.data ?? []
        if (controller.signal.aborted) return
        setPlexServers(servers)
        if (servers.length === 0) {
          setLoading(false)
          return
        }
        const firstId = resolveInitialServerId(servers, STORAGE_KEYS.serverId)
        setSelectedServerId(firstId)
        await loadMovies(firstId)
      } catch (err: unknown) {
        if (controller.signal.aborted) return
        if (err instanceof ApiError) setError(err.message)
        else setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }
    init()
    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        movies: section.movies.map((m) => (m.id === movieId ? { ...m, ...patch } : m)),
      }))
    )
    if (selectedServerId) updateEnrichmentCacheMovie(selectedServerId, movieId, patch)
  }

  async function refreshMovies(movieIds: string[]) {
    if (!selectedServerId) return
    await Promise.all(movieIds.map(async (movieId) => {
      const detailRes = await api.get<Partial<Movie>>(`/api/movies/${movieId}`, {
        query: { server_id: selectedServerId },
        throwOnError: false,
        responseSchema: MovieDetailSchema,
      })
      if (!detailRes.ok || !detailRes.data) return
      const detail = detailRes.data
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          movies: section.movies.map((m) => (m.id === movieId ? { ...m, ...detail } : m)),
        }))
      )
      updateEnrichmentCacheMovie(selectedServerId, movieId, detail)
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
