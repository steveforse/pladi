import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import pladiLogo from '@/assets/pladi_logo.png'
import { EditableCell } from '@/components/movies/EditableCell'
import { FilterRow } from '@/components/movies/FilterRow'
import { HamburgerMenu } from '@/components/movies/HamburgerMenu'
import { ImageModal } from '@/components/movies/ImageModal'
import { ColumnPicker } from '@/components/movies/ColumnPicker'
import { Paginator } from '@/components/movies/Paginator'
import { usePagination } from '@/hooks/usePagination'
import { matchesFilterWithFields } from '@/lib/filters'
import { EPISODE_FILTER_FIELDS, EPISODE_FILTER_FIELD_GROUPS, SHOW_FILTER_FIELDS, SHOW_FILTER_FIELD_GROUPS } from '@/lib/showFilters'
import { EPISODE_COLUMN_GROUPS, SHOW_COLUMN_GROUPS } from '@/lib/showColumns'
import { useShowsData } from '@/hooks/useShowsData'
import type { ShowsViewMode } from '@/hooks/useShowsData'
import { formatBitrate, formatDate, formatDuration, formatFrameRate, formatISODate, formatResolution, formatSize } from '@/lib/formatters'
import { sortMovies } from '@/lib/sorting'
import type { ActiveFilter, AllColumnId, ColumnId, SortDir, SortKey } from '@/lib/types'

const FILTERS_STORAGE_KEY = 'pladi.shows.filters'
const COLUMNS_STORAGE_KEY = 'pladi.shows.columns'
const FILTERS_OPEN_STORAGE_KEY = 'pladi.shows.filters_open'
const SORT_STORAGE_KEY = 'pladi.shows.sort'
const VIEW_MODE_STORAGE_KEY = 'pladi.shows.view_mode'

const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  'id',
  'year',
  'season_count',
  'episode_count',
  'viewed_episode_count',
  'studio',
  'genres',
  'summary',
]

const EPISODE_DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  'id',
  'season_count',
  'episode_count',
  'container',
  'video_codec',
  'video_resolution',
  'audio_codec',
  'audio_channels',
  'subtitles',
  'file_path',
  'size',
  'duration',
]

const SHOW_DEFAULT_COL_ORDER: AllColumnId[] = [
  'id',
  'title',
  'year',
  'season_count',
  'episode_count',
  'viewed_episode_count',
  'original_title',
  'sort_title',
  'originally_available',
  'updated_at',
  'content_rating',
  'studio',
  'genres',
  'summary',
  'tagline',
  'collections',
  'labels',
  'country',
  'poster',
  'background',
]

const EPISODE_DEFAULT_COL_ORDER: AllColumnId[] = [
  'id',
  'original_title',
  'title',
  'duration',
  'episode_count',
  'updated_at',
  'season_count',
  'year',
  'aspect_ratio',
  'frame_rate',
  'height',
  'video_bitrate',
  'video_codec',
  'video_resolution',
  'width',
  'audio_bitrate',
  'audio_codec',
  'audio_channels',
  'audio_language',
  'audio_tracks',
  'subtitles',
  'container',
  'file_path',
  'overall_bitrate',
  'size',
  'poster',
  'background',
]

const SHOW_TABLE_COLUMNS: Array<{ id: AllColumnId; label: string; sortKey?: SortKey }> = [
  { id: 'id', label: 'ID', sortKey: 'id' },
  { id: 'title', label: 'Title', sortKey: 'title' },
  { id: 'original_title', label: 'Original Title', sortKey: 'original_title' },
  { id: 'year', label: 'Year', sortKey: 'year' },
  { id: 'season_count', label: 'Seasons', sortKey: 'season_count' },
  { id: 'episode_count', label: 'Episodes', sortKey: 'episode_count' },
  { id: 'viewed_episode_count', label: 'Watched', sortKey: 'viewed_episode_count' },
  { id: 'sort_title', label: 'Sort Title', sortKey: 'sort_title' },
  { id: 'originally_available', label: 'Originally Available', sortKey: 'originally_available' },
  { id: 'updated_at', label: 'Last Updated', sortKey: 'updated_at' },
  { id: 'studio', label: 'Studio', sortKey: 'studio' },
  { id: 'genres', label: 'Genres', sortKey: 'genres' },
  { id: 'summary', label: 'Summary', sortKey: 'summary' },
  { id: 'content_rating', label: 'Content Rating', sortKey: 'content_rating' },
  { id: 'tagline', label: 'Tagline', sortKey: 'tagline' },
  { id: 'collections', label: 'Collections', sortKey: 'collections' },
  { id: 'labels', label: 'Labels', sortKey: 'labels' },
  { id: 'country', label: 'Country', sortKey: 'country' },
  { id: 'file_path', label: 'File Path', sortKey: 'file_path' },
  { id: 'container', label: 'Container', sortKey: 'container' },
  { id: 'video_codec', label: 'Video Codec', sortKey: 'video_codec' },
  { id: 'video_resolution', label: 'Resolution', sortKey: 'video_resolution' },
  { id: 'video_bitrate', label: 'Video Bitrate', sortKey: 'video_bitrate' },
  { id: 'width', label: 'Width', sortKey: 'width' },
  { id: 'height', label: 'Height', sortKey: 'height' },
  { id: 'aspect_ratio', label: 'Aspect Ratio', sortKey: 'aspect_ratio' },
  { id: 'frame_rate', label: 'Frame Rate', sortKey: 'frame_rate' },
  { id: 'audio_bitrate', label: 'Audio Bitrate', sortKey: 'audio_bitrate' },
  { id: 'audio_tracks', label: 'Audio Tracks', sortKey: 'audio_tracks' },
  { id: 'audio_language', label: 'Audio Language', sortKey: 'audio_language' },
  { id: 'subtitles', label: 'Subtitles', sortKey: 'subtitles' },
  { id: 'overall_bitrate', label: 'Overall Bitrate', sortKey: 'overall_bitrate' },
  { id: 'size', label: 'Size', sortKey: 'size' },
  { id: 'duration', label: 'Duration', sortKey: 'duration' },
  { id: 'poster', label: 'Poster' },
  { id: 'background', label: 'Background' },
]
const SHOW_VALID_COLUMN_IDS = new Set<ColumnId>(SHOW_TABLE_COLUMNS.filter((col) => col.id !== 'title').map((col) => col.id as ColumnId))

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-muted-foreground/40">↕</span>
  return <span className="ml-1 text-primary">{dir === 'asc' ? '↑' : '↓'}</span>
}

function isAlwaysVisibleColumn(viewMode: ShowsViewMode, id: AllColumnId): boolean {
  if (id === 'title') return true
  return viewMode === 'episodes' && id === 'original_title'
}

function loadSortFromStorage(): { sortKey: SortKey; sortDir: SortDir } {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY)
    if (!raw) return { sortKey: 'title', sortDir: 'asc' }
    const parsed = JSON.parse(raw) as { sortKey?: SortKey; sortDir?: SortDir }
    const validSortKeys = new Set(SHOW_TABLE_COLUMNS.filter((col) => col.sortKey).map((col) => col.sortKey as SortKey))
    const sortKey = parsed.sortKey && validSortKeys.has(parsed.sortKey) ? parsed.sortKey : 'title'
    const sortDir = parsed.sortDir === 'desc' ? 'desc' : 'asc'
    return { sortKey, sortDir }
  } catch {
    return { sortKey: 'title', sortDir: 'asc' }
  }
}

export default function ShowsTable({
  onMovies,
  onLogout,
  onSettings,
  onHistory,
  downloadImages = false,
  initialViewMode,
  routeServerId,
  routeLibrary,
  onRouteStateChange,
}: {
  onMovies: () => void
  onLogout: () => void
  onSettings: () => void
  onHistory: () => void
  downloadImages?: boolean
  initialViewMode?: ShowsViewMode
  routeServerId?: number | null
  routeLibrary?: string | null
  onRouteStateChange?: (state: { serverId: number | null; library: string | null; mode: ShowsViewMode }) => void
}) {
  const [viewMode, setViewMode] = useState<ShowsViewMode>(() => {
    if (initialViewMode) return initialViewMode
    try {
      return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'episodes' ? 'episodes' : 'shows'
    } catch {
      return 'shows'
    }
  })
  const {
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
  } = useShowsData(viewMode)

  const [sortKey, setSortKey] = useState<SortKey>(() => loadSortFromStorage().sortKey)
  const [sortDir, setSortDir] = useState<SortDir>(() => loadSortFromStorage().sortDir)
  const [openPosterShowId, setOpenPosterShowId] = useState<string | null>(null)
  const [openBackgroundShowId, setOpenBackgroundShowId] = useState<string | null>(null)

  const [unwatchedOnly, setUnwatchedOnly] = useState(false)
  const [partiallyWatchedOnly, setPartiallyWatchedOnly] = useState(false)

  const [filtersOpen, setFiltersOpen] = useState(() => {
    try {
      return localStorage.getItem(FILTERS_OPEN_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_STORAGE_KEY)
      if (!raw) return new Set(viewMode === 'episodes' ? EPISODE_DEFAULT_VISIBLE_COLUMNS : DEFAULT_VISIBLE_COLUMNS)
      const parsed = JSON.parse(raw) as ColumnId[] | { visibleCols?: ColumnId[]; colOrder?: AllColumnId[] }
      const fallback = viewMode === 'episodes' ? EPISODE_DEFAULT_VISIBLE_COLUMNS : DEFAULT_VISIBLE_COLUMNS
      const storedVisible = Array.isArray(parsed) ? parsed : (parsed.visibleCols ?? fallback)
      const normalizedVisible = storedVisible.filter((id): id is ColumnId => SHOW_VALID_COLUMN_IDS.has(id as ColumnId))
      return new Set(normalizedVisible)
    } catch {
      return new Set(viewMode === 'episodes' ? EPISODE_DEFAULT_VISIBLE_COLUMNS : DEFAULT_VISIBLE_COLUMNS)
    }
  })
  const [colOrder, setColOrder] = useState<AllColumnId[]>(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_STORAGE_KEY)
      if (!raw) return [...(viewMode === 'episodes' ? EPISODE_DEFAULT_COL_ORDER : SHOW_DEFAULT_COL_ORDER)]
      const parsed = JSON.parse(raw) as ColumnId[] | { visibleCols?: ColumnId[]; colOrder?: AllColumnId[] }
      const stored = Array.isArray(parsed) ? [] : (parsed.colOrder ?? [])
      const fallbackOrder = viewMode === 'episodes' ? EPISODE_DEFAULT_COL_ORDER : SHOW_DEFAULT_COL_ORDER
      const normalized = stored.filter((id): id is AllColumnId => fallbackOrder.includes(id as AllColumnId))
      const deduped = Array.from(new Set(normalized))
      return [...deduped, ...fallbackOrder.filter((id) => !deduped.includes(id))]
    } catch {
      return [...(viewMode === 'episodes' ? EPISODE_DEFAULT_COL_ORDER : SHOW_DEFAULT_COL_ORDER)]
    }
  })
  const dragColRef = useRef<AllColumnId | null>(null)
  const [dragOverCol, setDragOverCol] = useState<AllColumnId | null>(null)

  const [filters, setFilters] = useState<ActiveFilter[]>(() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const nextId = useRef(filters.length > 0 ? Math.max(...filters.map((f) => f.id)) + 1 : 1)

  const activeFilterCount =
    [unwatchedOnly, partiallyWatchedOnly].filter(Boolean).length +
    filters.length

  function addFilter() {
    setFilters((prev) => [
      ...prev,
      { id: nextId.current++, field: 'title', op: 'includes', value: '' },
    ])
  }

  function updateFilter(id: number, updated: ActiveFilter) {
    setFilters((prev) => prev.map((f) => (f.id === id ? updated : f)))
  }

  function removeFilter(id: number) {
    setFilters((prev) => prev.filter((f) => f.id !== id))
  }

  function clearAllFilters() {
    setFilters([])
    setUnwatchedOnly(false)
    setPartiallyWatchedOnly(false)
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function toggleFiltersOpen() {
    setFiltersOpen((open) => {
      const next = !open
      try {
        localStorage.setItem(FILTERS_OPEN_STORAGE_KEY, String(next))
      } catch {
        // storage unavailable
      }
      return next
    })
  }

  function handleColChange(id: ColumnId, checked: boolean) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function resetColumns() {
    setVisibleCols(new Set(viewMode === 'episodes' ? EPISODE_DEFAULT_VISIBLE_COLUMNS : DEFAULT_VISIBLE_COLUMNS))
    setColOrder([...(viewMode === 'episodes' ? EPISODE_DEFAULT_COL_ORDER : SHOW_DEFAULT_COL_ORDER)])
  }

  function handleViewModeChange(nextMode: ShowsViewMode) {
    if (nextMode === viewMode) return
    setViewMode(nextMode)
    setFilters([])
    setUnwatchedOnly(false)
    setPartiallyWatchedOnly(false)
    setVisibleCols(new Set(nextMode === 'episodes' ? EPISODE_DEFAULT_VISIBLE_COLUMNS : DEFAULT_VISIBLE_COLUMNS))
    setColOrder([...(nextMode === 'episodes' ? EPISODE_DEFAULT_COL_ORDER : SHOW_DEFAULT_COL_ORDER)])
  }

  function handleColDragStart(id: AllColumnId) {
    dragColRef.current = id
  }

  function handleColDragOver(e: React.DragEvent, id: AllColumnId) {
    e.preventDefault()
    setDragOverCol(id)
  }

  function handleColDrop(targetId: AllColumnId) {
    const src = dragColRef.current
    if (!src || src === targetId) {
      setDragOverCol(null)
      return
    }
    setColOrder((prev) => {
      const next = [...prev]
      const from = next.indexOf(src)
      const to = next.indexOf(targetId)
      next.splice(from, 1)
      next.splice(to, 0, src)
      return next
    })
    dragColRef.current = null
    setDragOverCol(null)
  }

  function handleColDragEnd() {
    dragColRef.current = null
    setDragOverCol(null)
  }

  const filteredShows = useMemo(() => {
    const shows = selectedTitle === null
      ? sections.flatMap((s) => s.movies)
      : (sections.find((s) => s.title === selectedTitle)?.movies ?? [])

    const quickFiltered = shows.filter((show) => {
      if (viewMode === 'episodes') return true
      if (unwatchedOnly && (show.viewed_episode_count ?? 0) > 0) return false

      if (partiallyWatchedOnly) {
        const viewed = show.viewed_episode_count ?? 0
        const total = show.episode_count ?? 0
        if (!(viewed > 0 && total > 0 && viewed < total)) return false
      }

      return true
    })

    const fieldDefs = viewMode === 'episodes' ? EPISODE_FILTER_FIELDS : SHOW_FILTER_FIELDS
    const advancedFiltered = filters.length > 0
      ? quickFiltered.filter((show) => filters.every((f) => matchesFilterWithFields(fieldDefs, show, f)))
      : quickFiltered

    return sortMovies(advancedFiltered, sortKey, sortDir)
  }, [
    viewMode,
    sections,
    selectedTitle,
    sortKey,
    sortDir,
    filters,
    unwatchedOnly,
    partiallyWatchedOnly,
  ])

  const { page, setPage, pageSize, totalPages, handlePageSize } = usePagination(filteredShows.length)
  const pagedShows = pageSize === 0 ? filteredShows : filteredShows.slice((page - 1) * pageSize, page * pageSize)
  const posterShows = downloadImages ? filteredShows.filter((show) => show.thumb) : []
  const posterModalIdx = openPosterShowId ? posterShows.findIndex((show) => show.id === openPosterShowId) : -1
  const posterModalShow = posterModalIdx >= 0 ? posterShows[posterModalIdx] : null
  const backgroundShows = downloadImages ? filteredShows.filter((show) => show.art) : []
  const backgroundModalIdx = openBackgroundShowId ? backgroundShows.findIndex((show) => show.id === openBackgroundShowId) : -1
  const backgroundModalShow = backgroundModalIdx >= 0 ? backgroundShows[backgroundModalIdx] : null

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch {
      // storage unavailable
    }
  }, [filters])

  useEffect(() => {
    try {
      localStorage.setItem(
        COLUMNS_STORAGE_KEY,
        JSON.stringify({ visibleCols: Array.from(visibleCols), colOrder })
      )
    } catch {
      // storage unavailable
    }
  }, [visibleCols, colOrder])

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
    } catch {
      // storage unavailable
    }
  }, [viewMode])

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ sortKey, sortDir }))
    } catch {
      // storage unavailable
    }
  }, [sortKey, sortDir])

  useEffect(() => {
    if (routeServerId == null || selectedServerId == null || routeServerId === selectedServerId) return
    if (!plexServers.some((s) => s.id === routeServerId)) return
    handleServerChange(routeServerId)
  }, [routeServerId, selectedServerId, plexServers, handleServerChange])

  useEffect(() => {
    if (routeLibrary === undefined || selectedTitle === routeLibrary) return
    if (routeLibrary === null) {
      handleLibraryChange(null)
      return
    }
    if (sections.some((s) => s.title === routeLibrary)) handleLibraryChange(routeLibrary)
  }, [routeLibrary, selectedTitle, sections, handleLibraryChange])

  useEffect(() => {
    onRouteStateChange?.({ serverId: selectedServerId, library: selectedTitle, mode: viewMode })
  }, [selectedServerId, selectedTitle, viewMode, onRouteStateChange])

  if (loading) {
    return (
      <div className="p-8 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 px-8 py-2" style={{ backgroundColor: '#1e2730' }}>
          <div className="flex items-center gap-3">
            <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
          </div>
          <div className="flex-1" />
          <HamburgerMenu onLogout={onLogout} onSettings={onSettings} onHistory={onHistory} />
        </div>
        <div className="px-8 py-4 space-y-3">
          <p className="text-destructive text-sm">Failed to load TV shows: {error}</p>
          <button onClick={onSettings} className="underline text-primary text-sm">Open Settings</button>
        </div>
      </div>
    )
  }

  if (plexServers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 px-8 py-2" style={{ backgroundColor: '#1e2730' }}>
          <div className="flex items-center gap-3">
            <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
          </div>
          <div className="flex-1" />
          <HamburgerMenu onLogout={onLogout} onSettings={onSettings} onHistory={onHistory} />
        </div>
        <div className="px-8 py-6 space-y-2">
          <h2 className="text-xl font-semibold">TV Shows</h2>
          <p className="text-muted-foreground text-sm">
            Add a Plex server in Settings to browse TV libraries.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 px-8 py-2" style={{ backgroundColor: '#1e2730' }}>
        <div className="flex items-center gap-3">
          <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
        </div>
        <div className="flex-1 flex justify-center">
          {syncing && (
            <span className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border" style={{ backgroundColor: '#E5A00D15', borderColor: '#E5A00D50', color: '#E5A00D' }}>
              <Loader2 size={12} className="animate-spin" />
              Syncing
            </span>
          )}
        </div>
        {refreshing && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Updating...
          </span>
        )}
        <HamburgerMenu onLogout={onLogout} onSettings={onSettings} onHistory={onHistory} />
      </div>

      <div className="px-8 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Server:</label>
            <select
              value={selectedServerId ?? ''}
              onChange={(e) => handleServerChange(Number(e.target.value))}
              className="border rounded px-3 py-1.5 text-sm bg-background"
            >
              {plexServers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Library Type:</label>
            <select
              aria-label="Library Type"
              value="shows"
              onChange={(e) => {
                if (e.target.value === 'movies') onMovies()
              }}
              className="border rounded px-3 py-1.5 text-sm bg-background"
            >
              <option value="movies">Movies</option>
              <option value="shows">TV Shows</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Library:</label>
            <select
              value={selectedTitle ?? ''}
              onChange={(e) => handleLibraryChange(e.target.value === '' ? null : e.target.value)}
              className="border rounded px-3 py-1.5 text-sm bg-background"
            >
              {sections.map((s) => (
                <option key={s.title} value={s.title}>{s.title}</option>
              ))}
              <option value="">All libraries</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">TV Mode:</label>
            <select
              aria-label="TV Mode"
              value={viewMode}
              onChange={(e) => handleViewModeChange(e.target.value as ShowsViewMode)}
              className="border rounded px-3 py-1.5 text-sm bg-background"
            >
              <option value="shows">Shows</option>
              <option value="episodes">Episodes</option>
            </select>
          </div>
        </div>

        <div className="border rounded-md w-fit">
          <button
            onClick={toggleFiltersOpen}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {filtersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full font-semibold" style={{ backgroundColor: '#E5A00D', color: '#161b1f' }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {filtersOpen && (
            <div className="px-3 pb-3 space-y-3 border-t pt-3">
              {viewMode === 'shows' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick filters</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Watch Status</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={unwatchedOnly} onChange={(e) => setUnwatchedOnly(e.target.checked)} />
                        Unwatched only
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={partiallyWatchedOnly} onChange={(e) => setPartiallyWatchedOnly(e.target.checked)} />
                        Partially watched
                      </label>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Metadata</p>
                      <p className="text-xs text-muted-foreground">Use advanced filters for summary/poster checks.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Advanced filters</p>
                {filters.map((f) => (
                  <FilterRow
                    key={f.id}
                    filter={f}
                    onChange={(updated) => updateFilter(f.id, updated)}
                    onRemove={() => removeFilter(f.id)}
                    fieldDefs={viewMode === 'episodes' ? EPISODE_FILTER_FIELDS : SHOW_FILTER_FIELDS}
                    fieldGroups={viewMode === 'episodes' ? EPISODE_FILTER_FIELD_GROUPS : SHOW_FILTER_FIELD_GROUPS}
                  />
                ))}
                <div className="flex items-center gap-2">
                  <button onClick={addFilter} className="btn px-3 py-1.5 text-sm">
                    + Add Filter
                  </button>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} className="btn px-3 py-1.5 text-sm text-destructive">
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <Paginator
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={filteredShows.length}
          itemLabel={viewMode === 'episodes' ? 'episodes' : 'shows'}
          onPage={setPage}
          onPageSize={handlePageSize}
          leftSlot={<ColumnPicker groups={viewMode === 'episodes' ? EPISODE_COLUMN_GROUPS : SHOW_COLUMN_GROUPS} visible={visibleCols} onChange={handleColChange} onReset={resetColumns} />}
        />

        <div className="rounded-md border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {colOrder
                  .filter((id) => isAlwaysVisibleColumn(viewMode, id) || visibleCols.has(id as ColumnId))
                  .map((id) => {
                    const col = SHOW_TABLE_COLUMNS.find((c) => c.id === id)
                    if (!col) return null
                    const label = viewMode === 'episodes' && id === 'title'
                      ? 'Episode Title'
                      : viewMode === 'episodes' && id === 'original_title'
                        ? 'Show Title'
                        : viewMode === 'episodes' && id === 'season_count'
                          ? 'Season'
                          : viewMode === 'episodes' && id === 'episode_count'
                              ? 'Episode'
                        : col.label
                    const isOver = dragOverCol === id
                    return (
                      <th
                        key={id}
                        className={`px-4 py-3 text-left font-medium whitespace-nowrap ${isOver ? 'bg-primary/10' : 'hover:bg-muted/70'}`}
                        onDragOver={(e) => handleColDragOver(e, id)}
                        onDrop={() => handleColDrop(id)}
                      >
                        <div className="flex items-center gap-1">
                          <span
                            draggable
                            aria-label={`Drag ${label} column`}
                            onDragStart={() => handleColDragStart(id)}
                            onDragEnd={handleColDragEnd}
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground shrink-0"
                          >
                            <GripVertical size={14} />
                          </span>
                          {col.sortKey ? (
                            <span className="cursor-pointer select-none" onClick={() => handleSort(col.sortKey as SortKey)}>
                              {label}
                              <SortIcon active={sortKey === col.sortKey} dir={sortDir} />
                            </span>
                          ) : (
                            <span>{label}</span>
                          )}
                        </div>
                      </th>
                    )
                  })}
              </tr>
            </thead>
            <tbody>
              {pagedShows.map((show) => (
                <tr key={`${show.id}|${show.file_path ?? ''}`} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
                  {colOrder
                    .filter((id) => isAlwaysVisibleColumn(viewMode, id) || visibleCols.has(id as ColumnId))
                    .map((id) => {
                      switch (id) {
                      case 'title':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.title}
                                fieldType="text"
                                onSave={async (v) => updateShow(show.id, { title: v as string })}
                                renderView={() => <span className="font-medium whitespace-nowrap">{show.title}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 font-medium whitespace-nowrap">{show.title}</td>
                      case 'id':
                        return (
                          <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {show.plex_url
                              ? <a href={show.plex_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{show.id}</a>
                              : show.id}
                          </td>
                        )
                      case 'original_title':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.original_title ?? '—'}</td>
                      case 'year':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.year != null ? String(show.year) : null}
                                fieldType="number"
                                onSave={async (v) => {
                                  const year = (v as string) ? parseInt(v as string, 10) : null
                                  await updateShow(show.id, { year: Number.isFinite(year) ? year : null })
                                }}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.year ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.year ?? '—'}</td>
                      case 'season_count':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.season_count ?? '—'}</td>
                      case 'episode_count':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.episode_count ?? '—'}</td>
                      case 'viewed_episode_count':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.viewed_episode_count ?? '—'}</td>
                      case 'sort_title':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.sort_title}
                                fieldType="text"
                                onSave={async (v) => updateShow(show.id, { sort_title: (v as string) || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.sort_title ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.sort_title ?? '—'}</td>
                      case 'originally_available':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.originally_available}
                                fieldType="date"
                                onSave={async (v) => updateShow(show.id, { originally_available: (v as string) || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{formatISODate(show.originally_available)}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatISODate(show.originally_available)}</td>
                      case 'updated_at':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatDate(show.updated_at)}</td>
                      case 'studio':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.studio}
                                fieldType="text"
                                onSave={async (v) => updateShow(show.id, { studio: (v as string) || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.studio ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.studio ?? '—'}</td>
                      case 'genres':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.genres ? show.genres.split(', ').filter(Boolean) : []}
                                fieldType="tags"
                                onSave={async (v) => updateShow(show.id, { genres: (v as string[]).join(', ') || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.genres ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.genres ?? '—'}</td>
                      case 'summary':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.summary}
                                fieldType="text"
                                onSave={async (v) => updateShow(show.id, { summary: (v as string) || null })}
                                renderView={() => (
                                  <span className="text-muted-foreground text-xs">
                                    {show.summary ? show.summary.slice(0, 160) + (show.summary.length > 160 ? '…' : '') : '—'}
                                  </span>
                                )}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs">{show.summary ? show.summary.slice(0, 160) + (show.summary.length > 160 ? '…' : '') : '—'}</td>
                      case 'content_rating':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.content_rating}
                                fieldType="text"
                                onSave={async (v) => updateShow(show.id, { content_rating: (v as string) || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.content_rating ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.content_rating ?? '—'}</td>
                      case 'tagline':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.tagline}
                                fieldType="text"
                                onSave={async (v) => updateShow(show.id, { tagline: (v as string) || null })}
                                renderView={() => (
                                  <span className="text-muted-foreground text-xs">
                                    {show.tagline ? show.tagline.slice(0, 120) + (show.tagline.length > 120 ? '…' : '') : '—'}
                                  </span>
                                )}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs">{show.tagline ? show.tagline.slice(0, 120) + (show.tagline.length > 120 ? '…' : '') : '—'}</td>
                      case 'collections':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.collections ? show.collections.split(', ').filter(Boolean) : []}
                                fieldType="tags"
                                onSave={async (v) => updateShow(show.id, { collections: (v as string[]).join(', ') || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.collections ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.collections ?? '—'}</td>
                      case 'labels':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.labels ? show.labels.split(', ').filter(Boolean) : []}
                                fieldType="tags"
                                onSave={async (v) => updateShow(show.id, { labels: (v as string[]).join(', ') || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.labels ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.labels ?? '—'}</td>
                      case 'country':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.country ? show.country.split(', ').filter(Boolean) : []}
                                fieldType="tags"
                                onSave={async (v) => updateShow(show.id, { country: (v as string[]).join(', ') || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.country ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.country ?? '—'}</td>
                      case 'file_path':
                        return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs break-all">{show.file_path ?? '—'}</td>
                      case 'container':
                        return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{show.container ?? '—'}</td>
                      case 'video_codec':
                        return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{show.video_codec ?? '—'}</td>
                      case 'video_resolution':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatResolution(show.video_resolution)}</td>
                      case 'video_bitrate':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(show.video_bitrate)}</td>
                      case 'width':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.width != null ? `${show.width}px` : '—'}</td>
                      case 'height':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.height != null ? `${show.height}px` : '—'}</td>
                      case 'aspect_ratio':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.aspect_ratio ?? '—'}</td>
                      case 'frame_rate':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatFrameRate(show.frame_rate)}</td>
                      case 'audio_codec':
                        return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{show.audio_codec ?? '—'}</td>
                      case 'audio_channels':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.audio_channels ?? '—'}</td>
                      case 'audio_bitrate':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(show.audio_bitrate)}</td>
                      case 'audio_tracks':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.audio_tracks ?? '—'}</td>
                      case 'audio_language':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.audio_language ?? '—'}</td>
                      case 'subtitles':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.subtitles ?? '—'}</td>
                      case 'overall_bitrate':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(show.overall_bitrate)}</td>
                      case 'size':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatSize(show.size)}</td>
                      case 'duration':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatDuration(show.duration)}</td>
                      case 'poster':
                        return downloadImages && show.thumb
                          ? (
                              <td key={id} className="px-2 py-1">
                                <button
                                  onClick={() => setOpenPosterShowId(show.id)}
                                  className="cursor-pointer focus:outline-none"
                                  aria-label={`Open poster for ${show.title}`}
                                >
                                  <img
                                    src={`/api/shows/${show.id}/poster?server_id=${selectedServerId}`}
                                    alt=""
                                    className="h-16 w-auto rounded hover:opacity-80 transition-opacity"
                                  />
                                </button>
                              </td>
                            )
                          : (
                              <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                                {show.thumb ? '✓' : '—'}
                              </td>
                            )
                      case 'background':
                        return downloadImages && show.art
                          ? (
                              <td key={id} className="px-2 py-1">
                                <button
                                  onClick={() => setOpenBackgroundShowId(show.id)}
                                  className="cursor-pointer focus:outline-none"
                                  aria-label={`Open background for ${show.title}`}
                                >
                                  <img
                                    src={`/api/shows/${show.id}/background?server_id=${selectedServerId}`}
                                    alt=""
                                    className="h-10 w-auto rounded hover:opacity-80 transition-opacity"
                                  />
                                </button>
                              </td>
                            )
                          : (
                              <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                                {show.art ? '✓' : '—'}
                              </td>
                            )
                    }
                  })}
                </tr>
              ))}
              {pagedShows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground text-sm" colSpan={Math.max(1, colOrder.filter((id) => isAlwaysVisibleColumn(viewMode, id) || visibleCols.has(id as ColumnId)).length)}>
                    No shows found in this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {posterModalShow && (
        <ImageModal
          movie={posterModalShow}
          imageUrl={`/api/shows/${posterModalShow.id}/poster?server_id=${selectedServerId}`}
          hasPrev={posterModalIdx > 0}
          hasNext={posterModalIdx < posterShows.length - 1}
          position={posterModalIdx + 1}
          total={posterShows.length}
          onClose={() => setOpenPosterShowId(null)}
          onPrev={() => setOpenPosterShowId(posterShows[posterModalIdx - 1].id)}
          onNext={() => setOpenPosterShowId(posterShows[posterModalIdx + 1].id)}
        />
      )}

      {backgroundModalShow && (
        <ImageModal
          movie={backgroundModalShow}
          imageUrl={`/api/shows/${backgroundModalShow.id}/background?server_id=${selectedServerId}`}
          hasPrev={backgroundModalIdx > 0}
          hasNext={backgroundModalIdx < backgroundShows.length - 1}
          position={backgroundModalIdx + 1}
          total={backgroundShows.length}
          onClose={() => setOpenBackgroundShowId(null)}
          onPrev={() => setOpenBackgroundShowId(backgroundShows[backgroundModalIdx - 1].id)}
          onNext={() => setOpenBackgroundShowId(backgroundShows[backgroundModalIdx + 1].id)}
        />
      )}
    </div>
  )
}
