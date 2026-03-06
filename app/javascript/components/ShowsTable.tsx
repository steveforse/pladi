import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import pladiLogo from '@/assets/pladi_logo.png'
import { EditableCell } from '@/components/movies/EditableCell'
import { FilterRow } from '@/components/movies/FilterRow'
import { HamburgerMenu } from '@/components/movies/HamburgerMenu'
import { ImageModal } from '@/components/movies/ImageModal'
import { ColumnPicker } from '@/components/movies/ColumnPicker'
import { Paginator } from '@/components/movies/Paginator'
import { BulkEditModal } from '@/components/movies/BulkEditModal'
import { DraggableSortableHeaderRow } from '@/components/movies/DraggableSortableHeaderRow'
import { usePagination } from '@/hooks/usePagination'
import { useColumnWidths } from '@/hooks/useColumnWidths'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { useBulkTagEdit } from '@/hooks/useBulkTagEdit'
import { useRouteSync } from '@/hooks/useRouteSync'
import { usePersistedTableState } from '@/hooks/usePersistedTableState'
import { matchesFilterWithFields } from '@/lib/filters'
import { EPISODE_FILTER_FIELDS, EPISODE_FILTER_FIELD_GROUPS, SHOW_FILTER_FIELDS, SHOW_FILTER_FIELD_GROUPS } from '@/lib/showFilters'
import { EPISODE_COLUMN_GROUPS, SHOW_COLUMN_GROUPS } from '@/lib/showColumns'
import { fileIsInSubfolder, pathContainsYear, pathYearMatchesMetadata, titleMatchesFilename, titleMatchesPath } from '@/lib/pathMatching'
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
  'title',
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
  'sort_title',
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
  'imdb_rating',
  'rt_audience_rating',
  'rt_critics_rating',
  'tmdb_rating',
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
  'show_title',
  'title',
  'sort_title',
  'season_count',
  'episode_count',
  'year',
  'originally_available',
  'updated_at',
  'duration',
  'content_rating',
  'imdb_rating',
  'rt_audience_rating',
  'rt_critics_rating',
  'tmdb_rating',
  'directors',
  'writers',
  'summary',
  'tagline',
  'video_codec',
  'video_bitrate',
  'frame_rate',
  'width',
  'height',
  'aspect_ratio',
  'video_resolution',
  'audio_codec',
  'audio_bitrate',
  'audio_channels',
  'audio_language',
  'audio_tracks',
  'subtitles',
  'file_path',
  'container',
  'overall_bitrate',
  'size',
  'poster',
  'background',
]

const SHOW_TABLE_COLUMNS: Array<{ id: AllColumnId; label: string; sortKey?: SortKey }> = [
  { id: 'id', label: 'ID', sortKey: 'id' },
  { id: 'title', label: 'Title', sortKey: 'title' },
  { id: 'original_title', label: 'Original Title', sortKey: 'original_title' },
  { id: 'show_title', label: 'Show Title', sortKey: 'show_title' },
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
  { id: 'imdb_rating', label: 'IMDb Rating', sortKey: 'imdb_rating' },
  { id: 'rt_audience_rating', label: 'RT Audience Rating', sortKey: 'rt_audience_rating' },
  { id: 'rt_critics_rating', label: 'RT Critics Rating', sortKey: 'rt_critics_rating' },
  { id: 'tmdb_rating', label: 'TMDb Rating', sortKey: 'tmdb_rating' },
  { id: 'tagline', label: 'Tagline', sortKey: 'tagline' },
  { id: 'collections', label: 'Collections', sortKey: 'collections' },
  { id: 'labels', label: 'Labels', sortKey: 'labels' },
  { id: 'country', label: 'Country', sortKey: 'country' },
  { id: 'directors', label: 'Directors', sortKey: 'directors' },
  { id: 'producers', label: 'Producers', sortKey: 'producers' },
  { id: 'writers', label: 'Writers', sortKey: 'writers' },
  { id: 'file_path', label: 'File Path', sortKey: 'file_path' },
  { id: 'container', label: 'Container', sortKey: 'container' },
  { id: 'video_codec', label: 'Video Codec', sortKey: 'video_codec' },
  { id: 'video_resolution', label: 'Resolution', sortKey: 'video_resolution' },
  { id: 'video_bitrate', label: 'Video Bitrate', sortKey: 'video_bitrate' },
  { id: 'width', label: 'Width', sortKey: 'width' },
  { id: 'height', label: 'Height', sortKey: 'height' },
  { id: 'aspect_ratio', label: 'Aspect Ratio', sortKey: 'aspect_ratio' },
  { id: 'frame_rate', label: 'Frame Rate', sortKey: 'frame_rate' },
  { id: 'audio_channels', label: 'Audio Channels', sortKey: 'audio_channels' },
  { id: 'audio_codec', label: 'Audio Codec', sortKey: 'audio_codec' },
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
const SHOW_VALID_COLUMN_IDS = new Set<ColumnId>(SHOW_TABLE_COLUMNS.map((col) => col.id as ColumnId))

function isAlwaysVisibleColumn(viewMode: ShowsViewMode, id: AllColumnId): boolean {
  if (id === 'title') return true
  return viewMode === 'episodes' && id === 'show_title'
}

const SHOW_BULK_TAG_FIELDS = [
  { field: 'collections', label: 'Collections' },
  { field: 'country', label: 'Country' },
  { field: 'genres', label: 'Genres' },
  { field: 'labels', label: 'Labels' },
] as const

const EPISODE_BULK_TAG_FIELDS = [
  { field: 'directors', label: 'Directors' },
  { field: 'writers', label: 'Writers' },
] as const

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
  const [bulkEditOpen, setBulkEditOpen] = useState(false)

  const [unwatchedOnly, setUnwatchedOnly] = useState(false)
  const [partiallyWatchedOnly, setPartiallyWatchedOnly] = useState(false)
  const [fullyWatchedOnly, setFullyWatchedOnly] = useState(false)
  const [multiOnly, setMultiOnly] = useState(false)
  const [unmatchedOnly, setUnmatchedOnly] = useState(false)
  const [filenameMismatch, setFilenameMismatch] = useState(false)
  const [noYearInPath, setNoYearInPath] = useState(false)
  const [yearPathMismatch, setYearPathMismatch] = useState(false)
  const [notInSubfolder, setNotInSubfolder] = useState(false)

  const [filtersOpen, setFiltersOpen] = useState(() => {
    try {
      return localStorage.getItem(FILTERS_OPEN_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const {
    visibleCols,
    setVisibleCols,
    colOrder,
    setColOrder,
    dragOverCol,
    handleColChange,
    resetColumns: resetPersistedColumns,
    handleColDragStart,
    handleColDragOver,
    handleColDrop,
    handleColDragEnd,
  } = usePersistedTableState({
    storageKey: COLUMNS_STORAGE_KEY,
    defaultVisible: viewMode === 'episodes' ? EPISODE_DEFAULT_VISIBLE_COLUMNS : DEFAULT_VISIBLE_COLUMNS,
    defaultOrder: viewMode === 'episodes' ? EPISODE_DEFAULT_COL_ORDER : SHOW_DEFAULT_COL_ORDER,
    validIds: SHOW_VALID_COLUMN_IDS,
    storage: 'local',
  })
  const { colWidths, startResize, resetWidths } = useColumnWidths(`pladi.shows.column_widths.${viewMode}`)

  const [filters, setFilters] = useState<ActiveFilter[]>(() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const nextId = useRef(filters.length > 0 ? Math.max(...filters.map((f) => f.id)) + 1 : 1)
  useEffect(() => {
    const validFields = new Set((viewMode === 'episodes' ? EPISODE_FILTER_FIELDS : SHOW_FILTER_FIELDS).map((f) => f.id))
    setFilters((prev) => prev.filter((f) => validFields.has(f.field)))
  }, [viewMode])

  const activeFilterCount =
    [unwatchedOnly, partiallyWatchedOnly, fullyWatchedOnly, multiOnly, unmatchedOnly, filenameMismatch, noYearInPath, yearPathMismatch, notInSubfolder].filter(Boolean).length +
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
    setFullyWatchedOnly(false)
    setMultiOnly(false)
    setUnmatchedOnly(false)
    setFilenameMismatch(false)
    setNoYearInPath(false)
    setYearPathMismatch(false)
    setNotInSubfolder(false)
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

  function resetColumns() {
    resetPersistedColumns()
    resetWidths()
  }

  function handleViewModeChange(nextMode: ShowsViewMode) {
    if (nextMode === viewMode) return
    setViewMode(nextMode)
    clearSelection()
    setFilters([])
    setUnwatchedOnly(false)
    setPartiallyWatchedOnly(false)
    setFullyWatchedOnly(false)
    setMultiOnly(false)
    setUnmatchedOnly(false)
    setFilenameMismatch(false)
    setNoYearInPath(false)
    setYearPathMismatch(false)
    setNotInSubfolder(false)
    setVisibleCols(new Set(nextMode === 'episodes' ? EPISODE_DEFAULT_VISIBLE_COLUMNS : DEFAULT_VISIBLE_COLUMNS))
    setColOrder([...(nextMode === 'episodes' ? EPISODE_DEFAULT_COL_ORDER : SHOW_DEFAULT_COL_ORDER)])
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
      if (fullyWatchedOnly) {
        const viewed = show.viewed_episode_count ?? 0
        const total = show.episode_count ?? 0
        if (!(total > 0 && viewed >= total)) return false
      }

      return true
    })

    const quickEpisodesFiltered = viewMode === 'episodes'
      ? (() => {
          let rows = quickFiltered
          if (multiOnly) {
            const counts = new Map<string, number>()
            for (const row of rows) counts.set(row.id, (counts.get(row.id) ?? 0) + 1)
            rows = rows.filter((row) => (counts.get(row.id) ?? 0) > 1)
          }
          if (unmatchedOnly) rows = rows.filter((row) => !titleMatchesPath(row))
          if (filenameMismatch) rows = rows.filter((row) => !titleMatchesFilename(row))
          if (noYearInPath) rows = rows.filter((row) => !pathContainsYear(row))
          if (yearPathMismatch) rows = rows.filter((row) => !pathYearMatchesMetadata(row))
          if (notInSubfolder) rows = rows.filter((row) => !fileIsInSubfolder(row))
          return rows
        })()
      : quickFiltered

    const fieldDefs = viewMode === 'episodes' ? EPISODE_FILTER_FIELDS : SHOW_FILTER_FIELDS
    const advancedFiltered = filters.length > 0
      ? quickEpisodesFiltered.filter((show) => filters.every((f) => matchesFilterWithFields(fieldDefs, show, f)))
      : quickEpisodesFiltered

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
    fullyWatchedOnly,
    multiOnly,
    unmatchedOnly,
    filenameMismatch,
    noYearInPath,
    yearPathMismatch,
    notInSubfolder,
  ])

  const { page, setPage, pageSize, totalPages, handlePageSize } = usePagination(filteredShows.length)
  const pagedShows = pageSize === 0 ? filteredShows : filteredShows.slice((page - 1) * pageSize, page * pageSize)
  const {
    selectedIds,
    allSelected,
    someSelected,
    toggleAll: handleToggleAll,
    toggleRow: handleToggleRow,
    clearSelection,
  } = useBulkSelection({ pageItems: pagedShows, visibleItems: filteredShows })
  const posterShows = downloadImages ? filteredShows.filter((show) => show.thumb) : []
  const posterModalIdx = openPosterShowId ? posterShows.findIndex((show) => show.id === openPosterShowId) : -1
  const posterModalShow = posterModalIdx >= 0 ? posterShows[posterModalIdx] : null
  const backgroundShows = downloadImages ? filteredShows.filter((show) => show.art) : []
  const backgroundModalIdx = openBackgroundShowId ? backgroundShows.findIndex((show) => show.id === openBackgroundShowId) : -1
  const backgroundModalShow = backgroundModalIdx >= 0 ? backgroundShows[backgroundModalIdx] : null

  const { handleBulkSave } = useBulkTagEdit({
    rows: filteredShows,
    selectedIds,
    updateItem: async (id, patch) => updateShow(id, patch),
    onComplete: () => {
      clearSelection()
      setBulkEditOpen(false)
    },
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch {
      // storage unavailable
    }
  }, [filters])

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

  const routeState = useMemo(
    () => ({ serverId: selectedServerId, library: selectedTitle, mode: viewMode }),
    [selectedServerId, selectedTitle, viewMode]
  )
  useRouteSync({
    routeServerId,
    routeLibrary,
    selectedServerId,
    selectedLibrary: selectedTitle,
    servers: plexServers,
    sections,
    onServerChange: handleServerChange,
    onLibraryChange: handleLibraryChange,
    state: routeState,
    onRouteStateChange,
  })

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
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={fullyWatchedOnly} onChange={(e) => setFullyWatchedOnly(e.target.checked)} />
                        Fully watched
                      </label>
                    </div>
                  </div>
                </div>
              )}
              {viewMode === 'episodes' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick filters</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Title</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={unmatchedOnly} onChange={(e) => setUnmatchedOnly(e.target.checked)} />
                        Mismatches file path
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={filenameMismatch} onChange={(e) => setFilenameMismatch(e.target.checked)} />
                        Mismatches filename
                      </label>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Year</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={noYearInPath} onChange={(e) => setNoYearInPath(e.target.checked)} />
                        Missing from file path
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={yearPathMismatch} onChange={(e) => setYearPathMismatch(e.target.checked)} />
                        File path mismatches metadata
                      </label>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">File</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={multiOnly} onChange={(e) => setMultiOnly(e.target.checked)} />
                        Multiple files only
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={notInSubfolder} onChange={(e) => setNotInSubfolder(e.target.checked)} />
                        Not in show subfolder
                      </label>
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
          centerSlot={selectedIds.size > 0 ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBulkEditOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border font-medium"
                style={{ backgroundColor: '#E5A00D15', borderColor: '#E5A00D50', color: '#E5A00D' }}
              >
                Bulk Edit ({selectedIds.size})
              </button>
              <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground">
                Clear selection
              </button>
            </div>
          ) : undefined}
        />

        <div className="rounded-md border overflow-auto">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-8" />
              {colOrder
                .filter((id) => isAlwaysVisibleColumn(viewMode, id) || visibleCols.has(id as ColumnId))
                .map((id) => (
                  <col
                    key={id}
                    style={colWidths[id] ? { width: `${colWidths[id]}px`, minWidth: `${colWidths[id]}px` } : undefined}
                  />
                ))}
            </colgroup>
            <thead>
              <DraggableSortableHeaderRow
                columns={colOrder
                  .filter((id) => isAlwaysVisibleColumn(viewMode, id) || visibleCols.has(id as ColumnId))
                  .map((id) => {
                    const col = SHOW_TABLE_COLUMNS.find((c) => c.id === id)
                    if (!col) return null
                    const label = viewMode === 'episodes' && id === 'title'
                      ? 'Episode Title'
                      : viewMode === 'episodes' && id === 'show_title'
                        ? 'Show Title'
                        : viewMode === 'episodes' && id === 'season_count'
                          ? 'Season'
                          : viewMode === 'episodes' && id === 'episode_count'
                            ? 'Episode'
                            : col.label
                    return { id, label, sortKey: col.sortKey, width: colWidths[id] }
                  })
                  .filter((col): col is { id: AllColumnId; label: string; sortKey?: SortKey; width?: number } => col !== null)}
                sortKey={sortKey}
                sortDir={sortDir}
                dragOverCol={dragOverCol}
                onSort={handleSort}
                onDragStart={handleColDragStart}
                onDragOver={handleColDragOver}
                onDrop={handleColDrop}
                onDragEnd={handleColDragEnd}
                onResizeStart={startResize}
                leadingCheckbox={{ checked: allSelected, indeterminate: someSelected, onChange: handleToggleAll }}
                rowClassName="border-b bg-muted/30"
              />
            </thead>
            <tbody className="[&_td]:align-top [&_td]:break-words [&_td]:!whitespace-normal">
              {pagedShows.map((show) => (
                <tr key={`${show.id}|${show.file_path ?? ''}`} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
                  <td className="px-2 py-1 w-8">
                    <input type="checkbox" checked={selectedIds.has(show.id)} onChange={() => handleToggleRow(show.id)} />
                  </td>
                  {colOrder
                    .filter((id) => isAlwaysVisibleColumn(viewMode, id) || visibleCols.has(id as ColumnId))
                    .map((id) => {
                      switch (id) {
                      case 'title':
                        return (
                          <EditableCell
                            key={id}
                            value={show.title}
                            fieldType="text"
                            onSave={async (v) => updateShow(show.id, { title: v as string })}
                            renderView={() => <span className="font-medium whitespace-nowrap">{show.title}</span>}
                            className="px-4 py-2"
                          />
                        )
                      case 'id':
                        return (
                          <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {show.plex_url
                              ? <a href={show.plex_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{show.id}</a>
                              : show.id}
                          </td>
                        )
                      case 'original_title':
                        return (
                          <EditableCell
                            key={id}
                            value={show.original_title}
                            fieldType="text"
                            onSave={async (v) => updateShow(show.id, { original_title: (v as string) || null })}
                            renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.original_title ?? '—'}</span>}
                            className="px-4 py-2"
                          />
                        )
                      case 'show_title':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.show_title ?? '—'}</td>
                      case 'year':
                        return (
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
                      case 'season_count':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.season_count ?? '—'}</td>
                      case 'episode_count':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.episode_count ?? '—'}</td>
                      case 'viewed_episode_count':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.viewed_episode_count ?? '—'}</td>
                      case 'sort_title':
                        return (
                          <EditableCell
                            key={id}
                            value={show.sort_title}
                            fieldType="text"
                            onSave={async (v) => updateShow(show.id, { sort_title: (v as string) || null })}
                            renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.sort_title ?? '—'}</span>}
                            className="px-4 py-2"
                          />
                        )
                      case 'originally_available':
                        return (
                          <EditableCell
                            key={id}
                            value={show.originally_available}
                            fieldType="date"
                            onSave={async (v) => updateShow(show.id, { originally_available: (v as string) || null })}
                            renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{formatISODate(show.originally_available)}</span>}
                            className="px-4 py-2"
                          />
                        )
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
                        return (
                          <EditableCell
                            key={id}
                            value={show.summary}
                            fieldType="text"
                            onSave={async (v) => updateShow(show.id, { summary: (v as string) || null })}
                            renderView={() => (
                              <span className="text-muted-foreground text-xs" title={show.summary ?? undefined}>
                                {show.summary ? show.summary.slice(0, 160) + (show.summary.length > 160 ? '…' : '') : '—'}
                              </span>
                            )}
                            className="px-4 py-2"
                          />
                        )
                      case 'content_rating':
                        return (
                          <EditableCell
                            key={id}
                            value={show.content_rating}
                            fieldType="text"
                            onSave={async (v) => updateShow(show.id, { content_rating: (v as string) || null })}
                            renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.content_rating ?? '—'}</span>}
                            className="px-4 py-2"
                          />
                        )
                      case 'imdb_rating':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.imdb_rating != null ? show.imdb_rating.toFixed(1) : '—'}</td>
                      case 'rt_audience_rating':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.rt_audience_rating != null ? show.rt_audience_rating.toFixed(1) : '—'}</td>
                      case 'rt_critics_rating':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.rt_critics_rating != null ? show.rt_critics_rating.toFixed(1) : '—'}</td>
                      case 'tmdb_rating':
                        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.tmdb_rating != null ? show.tmdb_rating.toFixed(1) : '—'}</td>
                      case 'tagline':
                        return (
                          <EditableCell
                            key={id}
                            value={show.tagline}
                            fieldType="text"
                            onSave={async (v) => updateShow(show.id, { tagline: (v as string) || null })}
                            renderView={() => (
                              <span className="text-muted-foreground text-xs" title={show.tagline ?? undefined}>
                                {show.tagline ? show.tagline.slice(0, 120) + (show.tagline.length > 120 ? '…' : '') : '—'}
                              </span>
                            )}
                            className="px-4 py-2"
                          />
                        )
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
                      case 'directors':
                        return viewMode === 'episodes'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.directors ? show.directors.split(', ').filter(Boolean) : []}
                                fieldType="tags"
                                onSave={async (v) => updateShow(show.id, { directors: (v as string[]).join(', ') || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.directors ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.directors ?? '—'}</td>
                      case 'producers':
                        return viewMode === 'shows'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.producers ? show.producers.split(', ').filter(Boolean) : []}
                                fieldType="tags"
                                onSave={async (v) => updateShow(show.id, { producers: (v as string[]).join(', ') || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.producers ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.producers ?? '—'}</td>
                      case 'writers':
                        return viewMode === 'episodes'
                          ? (
                              <EditableCell
                                key={id}
                                value={show.writers ? show.writers.split(', ').filter(Boolean) : []}
                                fieldType="tags"
                                onSave={async (v) => updateShow(show.id, { writers: (v as string[]).join(', ') || null })}
                                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.writers ?? '—'}</span>}
                                className="px-4 py-2"
                              />
                            )
                          : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.writers ?? '—'}</td>
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
                  <td className="px-4 py-6 text-muted-foreground text-sm" colSpan={Math.max(2, colOrder.filter((id) => isAlwaysVisibleColumn(viewMode, id) || visibleCols.has(id as ColumnId)).length + 1)}>
                    No shows found in this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Paginator
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={filteredShows.length}
          itemLabel={viewMode === 'episodes' ? 'episodes' : 'shows'}
          onPage={setPage}
          onPageSize={handlePageSize}
          leftSlot={<ColumnPicker groups={viewMode === 'episodes' ? EPISODE_COLUMN_GROUPS : SHOW_COLUMN_GROUPS} visible={visibleCols} onChange={handleColChange} onReset={resetColumns} openDirection="up" />}
        />
      </div>

      {bulkEditOpen && selectedIds.size > 0 && (
        <BulkEditModal
          selectedMovies={filteredShows.filter((show) => selectedIds.has(show.id))}
          tagFields={viewMode === 'episodes' ? [...EPISODE_BULK_TAG_FIELDS] : [...SHOW_BULK_TAG_FIELDS]}
          mediaLabelSingular={viewMode === 'episodes' ? 'episode' : 'show'}
          mediaLabelPlural={viewMode === 'episodes' ? 'episodes' : 'shows'}
          onSave={handleBulkSave}
          onClose={() => setBulkEditOpen(false)}
        />
      )}

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
