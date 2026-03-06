import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api } from '@/lib/apiClient'
import { EnrichResponseSchema, PlexServerInfoListSchema, SectionListSchema } from '@/lib/apiSchemas'
import { SHOW_ENRICHMENT_FIELDS, mergeShowEnrichmentCache, saveShowEnrichmentCache } from '@/lib/enrichmentCache'
import { mergeEnrichedRows, normalizeTagPatch, resolveInitialLibrary, resolveInitialServerId } from '@/hooks/libraryDataUtils'
import type { PlexServerInfo, Section } from '@/lib/types'
import type { z } from 'zod'

type EnrichResponse = z.infer<typeof EnrichResponseSchema>
export type ShowsViewMode = 'shows' | 'episodes'

const STORAGE_KEYS = {
  serverId: 'pladi_selected_show_server_id',
  library: (viewMode: ShowsViewMode) => `pladi_selected_show_library_${viewMode}`,
}

export function useShowsData(viewMode: ShowsViewMode = 'shows') {
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

  const loadShows = useCallback(async (serverId: number) => {
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
        query: { server_id: serverId, view_mode: viewMode },
        responseSchema: SectionListSchema,
      })
      const data = listRes.data ?? []
      if (isStale()) return
      setSections(viewMode === 'shows' ? mergeShowEnrichmentCache(serverId, data) : data)
      if (data.length > 0) {
        setSelectedTitle(resolveInitialLibrary(data, STORAGE_KEYS.library(viewMode)))
      }
      setLoading(false)

      setRefreshing(true)
      try {
        const refreshRes = await api.get<Section[]>('/api/shows/refresh', {
          signal,
          query: { server_id: serverId, view_mode: viewMode },
          throwOnError: false,
          responseSchema: SectionListSchema,
        })
        if (isStale()) return
        if (refreshRes.ok && refreshRes.data) {
          const fresh = refreshRes.data
          setSections(viewMode === 'shows' ? mergeShowEnrichmentCache(serverId, fresh) : fresh)
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
          query: { server_id: serverId, view_mode: viewMode },
          throwOnError: false,
          responseSchema: EnrichResponseSchema,
        })
        if (isStale()) return
        if (enrichRes.ok && enrichRes.data?.sections) {
          if (viewMode === 'shows') saveShowEnrichmentCache(serverId, enrichRes.data.sections as Section[])
          setSections((prev) => mergeEnrichedRows({
            previousSections: prev,
            enrichedSections: enrichRes.data.sections as Section[],
            fields: SHOW_ENRICHMENT_FIELDS,
          }))
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
  }, [viewMode])

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
  }, [loadShows])

  function handleServerChange(id: number) {
    localStorage.setItem(STORAGE_KEYS.serverId, String(id))
    setSelectedServerId(id)
    loadShows(id)
  }

  function handleLibraryChange(title: string | null) {
    if (title !== null) localStorage.setItem(STORAGE_KEYS.library(viewMode), title)
    setSelectedTitle(title)
  }

  async function updateShow(showId: string, patch: Record<string, unknown>) {
    if (!selectedServerId) throw new Error('No server selected')

    const apiPatch = normalizeTagPatch(patch as Record<string, unknown>)

    await api.patch<unknown, { show: Record<string, unknown> }>(
      `/api/shows/${showId}`,
      { show: apiPatch },
      { query: { server_id: selectedServerId }, csrf: true }
    )

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        movies: section.movies.map((s) => (s.id === showId ? { ...s, ...patch } : s)),
      }))
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
    handleServerChange,
    handleLibraryChange,
    updateShow,
  }
}
