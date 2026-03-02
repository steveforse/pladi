import { useEffect, useRef, useState } from 'react'
import { createConsumer } from '@rails/actioncable'
import type { Movie, PlexServerInfo, Section } from '@/lib/types'
import { ENRICHMENT_FIELDS, mergeEnrichmentCache, saveEnrichmentCache, updateEnrichmentCacheMovie, savePosterReadyCache, loadPosterReadyCache } from '@/lib/enrichmentCache'

type PosterMovie = { id: string; thumb: string }

const STORAGE_KEYS = {
  serverId: 'pladi_selected_server_id',
  library: 'pladi_selected_library',
}

export function useMoviesData() {
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
  const consumerRef = useRef<ReturnType<typeof createConsumer> | null>(null)

  // Create Action Cable consumer once on mount, disconnect on unmount
  useEffect(() => {
    consumerRef.current = createConsumer()
    return () => { consumerRef.current?.disconnect() }
  }, [])

  // Subscribe to PostersChannel whenever selectedServerId changes
  useEffect(() => {
    if (!selectedServerId || !consumerRef.current) return
    setPosterReady(loadPosterReadyCache(selectedServerId))
    const sub = consumerRef.current.subscriptions.create(
      { channel: 'PostersChannel', server_id: selectedServerId },
      { received(data: { movie_id: string }) {
          setPosterReady((prev) => new Set([...prev, data.movie_id]))
      }}
    )
    return () => sub.unsubscribe()
  }, [selectedServerId])

  async function loadMovies(serverId: number) {
    setLoading(true)
    setSections([])
    setSelectedTitle(null)
    setPosterReady(loadPosterReadyCache(serverId))
    try {
      const res = await fetch(`/api/movies?server_id=${serverId}`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: Section[] = await res.json()
      setSections(mergeEnrichmentCache(serverId, data))
      if (data.length > 0) {
        const savedLibrary = localStorage.getItem(STORAGE_KEYS.library)
        const restored = savedLibrary && data.some((s) => s.title === savedLibrary) ? savedLibrary : data[0].title
        setSelectedTitle(restored)
      }
      setLoading(false)

      // Refresh section list from Plex
      setRefreshing(true)
      try {
        const refreshRes = await fetch(`/api/movies/refresh?server_id=${serverId}`)
        if (refreshRes.ok) {
          const fresh: Section[] = await refreshRes.json()
          setSections(mergeEnrichmentCache(serverId, fresh))
          setSelectedTitle((prev) =>
            prev === null || fresh.some((s) => s.title === prev)
              ? prev
              : (fresh[0]?.title ?? null)
          )
        }
      } finally {
        setRefreshing(false)
      }

      // Enrich with per-movie metadata
      setSyncing(true)
      try {
        const enrichRes = await fetch(`/api/movies/enrich?server_id=${serverId}`)
        if (enrichRes.ok) {
          const enrichData = await enrichRes.json()
          saveEnrichmentCache(serverId, enrichData.sections)
          setSections((prev) => {
            const prevById = new Map<string, Movie>()
            for (const section of prev) {
              for (const movie of section.movies) prevById.set(movie.id, movie)
            }
            return (enrichData.sections as Section[]).map((section) => ({
              ...section,
              movies: section.movies.map((movie: Movie) => {
                const existing = prevById.get(movie.id)
                if (!existing) return movie
                const changed = ENRICHMENT_FIELDS.some((f) => movie[f] !== existing[f])
                return changed ? movie : existing
              }),
            }))
          })
          if (enrichData.cached_poster_ids?.length) {
            savePosterReadyCache(serverId, enrichData.cached_poster_ids)
            setPosterReady((prev) => {
              const next = new Set(prev)
              for (const id of enrichData.cached_poster_ids) next.add(id)
              return next
            })
          }
          setUncachedPosterMovies(enrichData.uncached_poster_movies ?? [])
        }
      } finally {
        setSyncing(false)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  // Fetch servers on mount, then load movies for the first server
  useEffect(() => {
    const init = async () => {
      try {
        const serversRes = await fetch('/api/plex_servers')
        if (!serversRes.ok) throw new Error(`Failed to load servers: ${serversRes.status}`)
        const servers: PlexServerInfo[] = await serversRes.json()
        setPlexServers(servers)
        if (servers.length === 0) {
          setLoading(false)
          return
        }
        const savedId = Number(localStorage.getItem(STORAGE_KEYS.serverId))
        const firstId = (savedId && servers.some((s) => s.id === savedId)) ? savedId : servers[0].id
        setSelectedServerId(firstId)
        await loadMovies(firstId)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }
    init()
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
    const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''

    // Convert tag fields from comma-separated strings to arrays for the API
    const tagFields = ['genres', 'directors', 'writers', 'producers', 'collections', 'labels', 'country']
    const apiPatch: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(patch)) {
      if (tagFields.includes(key) && typeof val === 'string') {
        apiPatch[key] = val ? val.split(', ').map((t) => t.trim()).filter(Boolean) : []
      } else {
        apiPatch[key] = val
      }
    }

    const res = await fetch(`/api/movies/${movieId}?server_id=${selectedServerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ movie: apiPatch }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? `Save failed (${res.status})`)
    }
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        movies: section.movies.map((m) => (m.id === movieId ? { ...m, ...patch } : m)),
      }))
    )
    if (selectedServerId) updateEnrichmentCacheMovie(selectedServerId, movieId, patch)
  }

  async function warmPosters(priorityIds: string[]) {
    if (!selectedServerId || uncachedPosterMovies.length === 0) return
    const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''
    await fetch(
      `/api/movies/warm_posters?server_id=${selectedServerId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ priority_ids: priorityIds, movies: uncachedPosterMovies }),
      }
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
    handleServerChange,
    handleServerAdded,
    setSelectedTitle: handleLibraryChange,
    warmPosters,
    updateMovie,
  }
}
