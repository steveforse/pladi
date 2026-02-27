import { useEffect, useRef, useState } from 'react'
import { createConsumer } from '@rails/actioncable'
import type { PlexServerInfo, Section } from '@/lib/types'

type PosterMovie = { id: string; thumb: string }

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
    setPosterReady(new Set())
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
    try {
      const res = await fetch(`/api/movies?server_id=${serverId}`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: Section[] = await res.json()
      setSections(data)
      if (data.length > 0) setSelectedTitle(data[0].title)
      setLoading(false)

      // Refresh section list from Plex
      setRefreshing(true)
      try {
        const refreshRes = await fetch(`/api/movies/refresh?server_id=${serverId}`)
        if (refreshRes.ok) {
          const fresh: Section[] = await refreshRes.json()
          setSections(fresh)
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
          setSections(enrichData.sections)
          if (enrichData.cached_poster_ids?.length) {
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
        const firstId = servers[0].id
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
    setSelectedServerId(id)
    loadMovies(id)
  }

  function handleServerAdded(server: PlexServerInfo) {
    setPlexServers([server])
    setSelectedServerId(server.id)
    loadMovies(server.id)
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
    setSelectedTitle,
    warmPosters,
  }
}
