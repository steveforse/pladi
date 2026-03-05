import { useEffect, useRef, useState } from 'react'
import { ApiError, api } from '@/lib/apiClient'
import { EnrichResponseSchema, PlexServerInfoListSchema, SectionListSchema } from '@/lib/apiSchemas'
import { SHOW_ENRICHMENT_FIELDS, mergeShowEnrichmentCache, saveShowEnrichmentCache } from '@/lib/enrichmentCache'
import type { PlexServerInfo, Section } from '@/lib/types'
import type { z } from 'zod'

type EnrichResponse = z.infer<typeof EnrichResponseSchema>

const STORAGE_KEYS = {
  serverId: 'pladi_selected_show_server_id',
  library: 'pladi_selected_show_library',
}

export function useShowsData() {
  const [plexServers, setPlexServers] = useState<PlexServerInfo[]>([])
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadRequestIdRef = useRef(0)
  const activeLoadAbortRef = useRef<AbortController | null>(null)

  async function loadShows(serverId: number) {
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

    try {
      const listRes = await api.get<Section[]>('/api/shows', {
        signal,
        query: { server_id: serverId },
        responseSchema: SectionListSchema,
      })
      const data = listRes.data ?? []
      if (isStale()) return
      setSections(mergeShowEnrichmentCache(serverId, data))
      if (data.length > 0) {
        const savedLibrary = localStorage.getItem(STORAGE_KEYS.library)
        const restored = savedLibrary && data.some((s) => s.title === savedLibrary) ? savedLibrary : data[0].title
        setSelectedTitle(restored)
      }
      setLoading(false)

      setRefreshing(true)
      try {
        const refreshRes = await api.get<Section[]>('/api/shows/refresh', {
          signal,
          query: { server_id: serverId },
          throwOnError: false,
          responseSchema: SectionListSchema,
        })
        if (isStale()) return
        if (refreshRes.ok && refreshRes.data) {
          const fresh = refreshRes.data
          setSections(mergeShowEnrichmentCache(serverId, fresh))
          setSelectedTitle((prev) =>
            prev === null || fresh.some((s) => s.title === prev)
              ? prev
              : (fresh[0]?.title ?? null)
          )
        }
      } finally {
        if (!isStale()) setRefreshing(false)
      }

      setSyncing(true)
      try {
        const enrichRes = await api.get<EnrichResponse>('/api/shows/enrich', {
          signal,
          query: { server_id: serverId },
          throwOnError: false,
          responseSchema: EnrichResponseSchema,
        })
        if (isStale()) return
        if (enrichRes.ok && enrichRes.data?.sections) {
          saveShowEnrichmentCache(serverId, enrichRes.data.sections as Section[])
          setSections((prev) => {
            const prevById = new Map<string, Section['movies'][number]>()
            for (const section of prev) {
              for (const show of section.movies) prevById.set(show.id, show)
            }
            return (enrichRes.data.sections as Section[]).map((section) => ({
              ...section,
              movies: section.movies.map((show) => {
                const existing = prevById.get(show.id)
                if (!existing) return show
                const changed = SHOW_ENRICHMENT_FIELDS.some((f) => show[f] !== existing[f])
                return changed ? show : existing
              }),
            }))
          })
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
      if (activeLoadAbortRef.current === controller) activeLoadAbortRef.current = null
    }
  }

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
        const savedId = Number(localStorage.getItem(STORAGE_KEYS.serverId))
        const firstId = (savedId && servers.some((s) => s.id === savedId)) ? savedId : servers[0].id
        setSelectedServerId(firstId)
        await loadShows(firstId)
      } catch (err: unknown) {
        if (controller.signal.aborted) return
        if (err instanceof ApiError) setError(err.message)
        else setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    init()
    return () => {
      controller.abort()
      activeLoadAbortRef.current?.abort()
    }
  }, [])

  function handleServerChange(id: number) {
    localStorage.setItem(STORAGE_KEYS.serverId, String(id))
    setSelectedServerId(id)
    loadShows(id)
  }

  function handleLibraryChange(title: string | null) {
    if (title !== null) localStorage.setItem(STORAGE_KEYS.library, title)
    setSelectedTitle(title)
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
    handleServerChange,
    handleLibraryChange,
  }
}
