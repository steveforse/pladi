import { useEffect } from 'react'
import { ApiError, api } from '@/lib/apiClient'
import { PlexServerInfoListSchema } from '@/lib/apiSchemas'
import { resolveInitialServerId } from '@/hooks/libraryDataUtils'
import type { PlexServerInfo } from '@/lib/types'

export function usePlexServerBootstrap({
  storageKey,
  onServersLoaded,
  onSelectServer,
  onNoServers,
  onError,
  abortActiveLoad,
}: {
  storageKey: string
  onServersLoaded: (servers: PlexServerInfo[]) => void
  onSelectServer: (serverId: number) => Promise<void> | void
  onNoServers: () => void
  onError: (message: string) => void
  abortActiveLoad?: () => void
}) {
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
        onServersLoaded(servers)
        if (servers.length === 0) {
          onNoServers()
          return
        }
        await onSelectServer(resolveInitialServerId(servers, storageKey))
      } catch (error: unknown) {
        if (controller.signal.aborted) return
        if (error instanceof ApiError) onError(error.message)
        else onError(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    init()
    return () => {
      controller.abort()
      abortActiveLoad?.()
    }
  }, [abortActiveLoad, onError, onNoServers, onSelectServer, onServersLoaded, storageKey])
}
