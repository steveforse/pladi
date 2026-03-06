import { useCallback, useRef, useState } from 'react'
import { ApiError, api } from '@/lib/apiClient'
import { EnrichResponseSchema, SectionListSchema } from '@/lib/apiSchemas'
import { SHOW_ENRICHMENT_FIELDS, mergeShowEnrichmentCache, saveShowEnrichmentCacheDelta } from '@/lib/enrichmentCache'
import { mergeEnrichedRows, normalizeTagPatch, resolveInitialLibrary } from '@/hooks/libraryDataUtils'
import { usePlexServerBootstrap } from '@/hooks/usePlexServerBootstrap'
import type { MediaPatch, Movie, PlexServerInfo, Section } from '@/lib/types'
import type { z } from 'zod'

type EnrichResponse = z.infer<typeof EnrichResponseSchema>
export type ShowsViewMode = 'shows' | 'episodes'
export type ShowRowIdentity = Pick<Movie, 'id' | 'file_path'>

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
  const handleBootstrapError = useCallback((message: string) => {
    setError(message)
    setLoading(false)
  }, [])
  const handleNoServers = useCallback(() => setLoading(false), [])
  const abortActiveLoad = useCallback(() => {
    activeLoadAbortRef.current?.abort()
  }, [])

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
      setSections(await mergeShowEnrichmentCache(serverId, data, viewMode))
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
          setSections(await mergeShowEnrichmentCache(serverId, fresh, viewMode))
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
          setSections((prev) => {
            const mergedSections = mergeEnrichedRows({
              previousSections: prev,
              enrichedSections: enrichRes.data.sections as Section[],
              fields: SHOW_ENRICHMENT_FIELDS,
            })
            void saveShowEnrichmentCacheDelta(serverId, mergedSections, prev, viewMode)
            return mergedSections
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
  }, [viewMode])

  const handleSelectServer = useCallback(async (serverId: number) => {
    setSelectedServerId(serverId)
    await loadShows(serverId)
  }, [loadShows])

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
    loadShows(id)
  }

  function handleLibraryChange(title: string | null) {
    if (title !== null) localStorage.setItem(STORAGE_KEYS.library(viewMode), title)
    setSelectedTitle(title)
  }

  async function updateShow({ id, file_path: filePath }: ShowRowIdentity, patch: MediaPatch) {
    if (!selectedServerId) throw new Error('No server selected')

    const apiPatch = normalizeTagPatch(patch as Record<string, unknown>)

    await api.patch<unknown, { show: Record<string, unknown> }>(
      `/api/shows/${id}`,
      { show: apiPatch },
      { query: { server_id: selectedServerId, view_mode: viewMode, file_path: filePath }, csrf: true }
    )

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((s) => (
          s.id === id && s.file_path === filePath ? { ...s, ...patch } : s
        )),
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
