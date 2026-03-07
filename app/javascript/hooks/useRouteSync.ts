import { useEffect, useRef } from 'react'

export function useRouteSync<TState>({
  routeServerId,
  routeLibrary,
  selectedServerId,
  selectedLibrary,
  servers,
  sections,
  onServerChange,
  onLibraryChange,
  state,
  onRouteStateChange,
}: {
  routeServerId?: number | null
  routeLibrary?: string | null
  selectedServerId: number | null
  selectedLibrary: string | null
  servers: Array<{ id: number }>
  sections: Array<{ title: string }>
  onServerChange: (id: number) => void
  onLibraryChange: (title: string | null) => void
  state: TState
  onRouteStateChange?: (state: TState) => void
}) {
  const prevRouteServerIdRef = useRef<typeof routeServerId>(undefined)
  const prevRouteLibraryRef = useRef<typeof routeLibrary>(undefined)

  useEffect(() => {
    const routeServerChanged = prevRouteServerIdRef.current !== routeServerId
    prevRouteServerIdRef.current = routeServerId

    if (!routeServerChanged) return
    if (routeServerId == null || selectedServerId == null || routeServerId === selectedServerId) return
    if (!servers.some((server) => server.id === routeServerId)) return
    onServerChange(routeServerId)
  }, [routeServerId, selectedServerId, servers, onServerChange])

  useEffect(() => {
    const routeLibraryChanged = prevRouteLibraryRef.current !== routeLibrary
    prevRouteLibraryRef.current = routeLibrary

    if (!routeLibraryChanged) return
    if (routeLibrary === undefined || selectedLibrary === routeLibrary) return
    if (routeLibrary === null) {
      onLibraryChange(null)
      return
    }
    if (sections.some((section) => section.title === routeLibrary)) onLibraryChange(routeLibrary)
  }, [routeLibrary, selectedLibrary, sections, onLibraryChange])

  useEffect(() => {
    onRouteStateChange?.(state)
  }, [state, onRouteStateChange])
}
