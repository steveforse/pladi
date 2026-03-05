import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import pladiLogo from '@/assets/pladi_logo.png'

import { useMoviesData } from '@/hooks/useMoviesData'
import { useMoviesFilter } from '@/hooks/useMoviesFilter'
import { useColumnManager } from '@/hooks/useColumnManager'
import { usePagination } from '@/hooks/usePagination'

import { COLUMN_GROUPS } from '@/lib/columns'

import { HamburgerMenu } from '@/components/movies/HamburgerMenu'
import { WelcomeScreen } from '@/components/movies/WelcomeScreen'
import { FilterRow } from '@/components/movies/FilterRow'
import { ColumnPicker } from '@/components/movies/ColumnPicker'
import { Paginator } from '@/components/movies/Paginator'
import { MovieHeaderRow } from '@/components/movies/MovieHeaderRow'
import { MovieRow } from '@/components/movies/MovieRow'
import { PosterModal } from '@/components/movies/PosterModal'
import { ImageModal } from '@/components/movies/ImageModal'
import { BulkEditModal } from '@/components/movies/BulkEditModal'

export default function MoviesTable({
  onLogout,
  onSettings,
  onHistory,
  onShows,
  downloadImages,
  routeServerId,
  routeLibrary,
  onRouteStateChange,
}: {
  onLogout: () => void
  onSettings: () => void
  onHistory: () => void
  onShows: () => void
  downloadImages: boolean
  routeServerId?: number | null
  routeLibrary?: string | null
  onRouteStateChange?: (state: { serverId: number | null; library: string | null }) => void
}) {
  const {
    plexServers, selectedServerId, sections, selectedTitle,
    loading, refreshing, syncing, error, posterReady, backgroundReady,
    uncachedPosterMovies, warmPosters, uncachedBackgroundMovies, warmBackgrounds, updateMovie, refreshMovies,
    handleServerChange, handleServerAdded, setSelectedTitle,
  } = useMoviesData(downloadImages)

  const {
    multiOnly, setMultiOnly,
    unmatchedOnly, setUnmatchedOnly,
    filenameMismatch, setFilenameMismatch,
    originalTitleMismatch, setOriginalTitleMismatch,
    noYearInPath, setNoYearInPath,
    yearPathMismatch, setYearPathMismatch,
    notInSubfolder, setNotInSubfolder,
    sortKey, sortDir, handleSort,
    filters, addFilter, updateFilter, removeFilter, clearAllFilters,
    visibleMovies,
  } = useMoviesFilter(sections, selectedTitle)

  const {
    visibleCols, colOrder, dragOverCol,
    handleColChange, resetColumns, handleColDragStart, handleColDragOver, handleColDrop, handleColDragEnd,
  } = useColumnManager()

  const { page, setPage, pageSize, totalPages, handlePageSize } = usePagination(visibleMovies.length)

  const [filtersOpen, setFiltersOpen] = useState(() => localStorage.getItem('pladi_filters_open') === 'true')
  const [openPosterMovieId, setOpenPosterMovieId] = useState<string | null>(null)
  const [openBackgroundMovieId, setOpenBackgroundMovieId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkEditOpen, setBulkEditOpen] = useState(false)

  const posterMovies = visibleMovies.filter((m) => posterReady.has(m.id))
  const posterModalIdx = openPosterMovieId ? posterMovies.findIndex((m) => m.id === openPosterMovieId) : -1
  const posterModalMovie = posterModalIdx >= 0 ? posterMovies[posterModalIdx] : null

  const backgroundMovies = visibleMovies.filter((m) => backgroundReady.has(m.id))
  const backgroundModalIdx = openBackgroundMovieId ? backgroundMovies.findIndex((m) => m.id === openBackgroundMovieId) : -1
  const backgroundModalMovie = backgroundModalIdx >= 0 ? backgroundMovies[backgroundModalIdx] : null
  const activeFilterCount =
    [multiOnly, unmatchedOnly, filenameMismatch, originalTitleMismatch, noYearInPath, yearPathMismatch, notInSubfolder].filter(Boolean).length +
    filters.length

  const pagedMovies = pageSize === 0 ? visibleMovies : visibleMovies.slice((page - 1) * pageSize, page * pageSize)

  const allSelected = pagedMovies.length > 0 && pagedMovies.every((m) => selectedIds.has(m.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  function handleToggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pagedMovies.map((m) => m.id)))
    }
  }

  function handleToggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleBulkSave(tagValues: Partial<Record<'genres' | 'directors' | 'writers' | 'producers' | 'collections' | 'labels' | 'country', string[]>>, mode: 'append' | 'replace') {
    const movieMap = new Map(visibleMovies.map((m) => [m.id, m]))
    for (const id of selectedIds) {
      const movie = movieMap.get(id)
      if (!movie) continue
      const patch: Record<string, string | null> = {}
      for (const [field, newTags] of Object.entries(tagValues)) {
        if (mode === 'append') {
          const existing = (movie[field as keyof typeof movie] as string | null)?.split(', ').filter(Boolean) ?? []
          const merged = [...new Set([...existing, ...newTags])]
          patch[field] = merged.join(', ') || null
        } else {
          patch[field] = newTags.join(', ') || null
        }
      }
      await updateMovie(id, patch)
    }
    await refreshMovies(Array.from(selectedIds))
    setSelectedIds(new Set())
    setBulkEditOpen(false)
  }

  // Once syncing completes and we have uncached posters/backgrounds, warm them with current page first
  const wasSyncing = useRef(false)
  const pagedMoviesRef = useRef(pagedMovies)
  const warmPostersRef = useRef(warmPosters)
  const warmBackgroundsRef = useRef(warmBackgrounds)
  useLayoutEffect(() => {
    pagedMoviesRef.current = pagedMovies
    warmPostersRef.current = warmPosters
    warmBackgroundsRef.current = warmBackgrounds
  })
  useEffect(() => {
    if (wasSyncing.current && !syncing) {
      const priorityIds = pagedMoviesRef.current.map((m) => String(m.id))
      if (uncachedPosterMovies.length > 0) warmPostersRef.current(priorityIds)
      if (uncachedBackgroundMovies.length > 0) warmBackgroundsRef.current(priorityIds)
    }
    wasSyncing.current = syncing
  }, [syncing, uncachedPosterMovies.length, uncachedBackgroundMovies.length])

  useEffect(() => {
    if (routeServerId == null || selectedServerId == null || routeServerId === selectedServerId) return
    if (!plexServers.some((s) => s.id === routeServerId)) return
    handleServerChange(routeServerId)
  }, [routeServerId, selectedServerId, plexServers, handleServerChange])

  useEffect(() => {
    if (routeLibrary === undefined || selectedTitle === routeLibrary) return
    if (routeLibrary === null) {
      setSelectedTitle(null)
      return
    }
    if (sections.some((s) => s.title === routeLibrary)) setSelectedTitle(routeLibrary)
  }, [routeLibrary, selectedTitle, sections, setSelectedTitle])

  useEffect(() => {
    onRouteStateChange?.({ serverId: selectedServerId, library: selectedTitle })
  }, [selectedServerId, selectedTitle, onRouteStateChange])

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
          <p className="text-destructive text-sm">Failed to load movies: {error}</p>
          <p className="text-muted-foreground text-sm">
            Check your server URL and token in{' '}
            <button onClick={onSettings} className="underline text-primary">Settings</button>.
          </p>
        </div>
      </div>
    )
  }

  if (plexServers.length === 0) {
    return <WelcomeScreen onLogout={onLogout} onServerAdded={handleServerAdded} />
  }

  return (
    <div className="space-y-4">
      {/* Title bar */}
      <div className="flex items-center gap-4 px-8 py-2" style={{ backgroundColor: '#1e2730' }}>
        <div className="flex items-center gap-3">
          <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
        </div>
        <div className="flex-1 flex justify-center">
          {syncing && (
            <div className="flex items-center gap-2 px-4 py-2 text-sm rounded-md border" style={{ backgroundColor: '#E5A00D15', borderColor: '#E5A00D50', color: '#E5A00D' }}>
              <Loader2 size={14} className="animate-spin" />
              Syncing additional metadata from Plex...
            </div>
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

        {/* Server + Library selector */}
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
              value="movies"
              onChange={(e) => {
                if (e.target.value === 'shows') onShows()
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
              onChange={(e) => setSelectedTitle(e.target.value === '' ? null : e.target.value)}
              className="border rounded px-3 py-1.5 text-sm bg-background"
            >
              {sections.map((s) => (
                <option key={s.title} value={s.title}>{s.title}</option>
              ))}
              <option value="">All libraries</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="border rounded-md w-fit">
          <button
            onClick={() => setFiltersOpen((o) => { const next = !o; localStorage.setItem('pladi_filters_open', String(next)); return next })}
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
              {/* Quick filters */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick filters</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {/* Title group */}
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
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={originalTitleMismatch} onChange={(e) => setOriginalTitleMismatch(e.target.checked)} />
                      Mismatches Original Title
                    </label>
                  </div>
                  {/* Year group */}
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
                  {/* File group */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">File</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={multiOnly} onChange={(e) => setMultiOnly(e.target.checked)} />
                      Multiple files only
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={notInSubfolder} onChange={(e) => setNotInSubfolder(e.target.checked)} />
                      Not in movie subfolder
                    </label>
                  </div>
                </div>
              </div>
              {/* Advanced filters */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Advanced filters</p>
                {filters.map((f) => (
                  <FilterRow
                    key={f.id}
                    filter={f}
                    onChange={(updated) => updateFilter(f.id, updated)}
                    onRemove={() => removeFilter(f.id)}
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

        {/* Table */}
        {sections.length > 0 && (
          <div className="space-y-2">
            <Paginator
              page={page} totalPages={totalPages} pageSize={pageSize} total={visibleMovies.length}
              onPage={setPage} onPageSize={handlePageSize}
              leftSlot={<ColumnPicker groups={COLUMN_GROUPS} visible={visibleCols} onChange={handleColChange} onReset={resetColumns} />}
              centerSlot={selectedIds.size > 0 ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBulkEditOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border font-medium"
                    style={{ backgroundColor: '#E5A00D15', borderColor: '#E5A00D50', color: '#E5A00D' }}
                  >
                    Bulk Edit ({selectedIds.size})
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear selection
                  </button>
                </div>
              ) : undefined}
            />
            <div className="rounded-md border overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <MovieHeaderRow
                    colOrder={colOrder}
                    visibleCols={visibleCols}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    dragOverCol={dragOverCol}
                    allSelected={allSelected}
                    someSelected={someSelected}
                    onToggleAll={handleToggleAll}
                    onSort={handleSort}
                    onDragStart={handleColDragStart}
                    onDragOver={handleColDragOver}
                    onDrop={handleColDrop}
                    onDragEnd={handleColDragEnd}
                  />
                </thead>
                <tbody>
                  {pagedMovies.map((movie) => (
                    <MovieRow
                      key={`${movie.id}|${movie.file_path ?? ''}`}
                      movie={movie}
                      colOrder={colOrder}
                      visibleCols={visibleCols}
                      selectedServerId={selectedServerId}
                      downloadImages={downloadImages}
                      posterReady={posterReady}
                      backgroundReady={backgroundReady}
                      selected={selectedIds.has(movie.id)}
                      onToggle={handleToggleRow}
                      onUpdate={updateMovie}
                      onOpenPoster={setOpenPosterMovieId}
                      onOpenBackground={setOpenBackgroundMovieId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator
              page={page} totalPages={totalPages} pageSize={pageSize} total={visibleMovies.length}
              onPage={setPage} onPageSize={handlePageSize}
              leftSlot={<ColumnPicker groups={COLUMN_GROUPS} visible={visibleCols} onChange={handleColChange} onReset={resetColumns} openDirection="up" />}
            />
          </div>
        )}
      </div>

      {posterModalMovie && (
        <PosterModal
          movie={posterModalMovie}
          selectedServerId={selectedServerId}
          hasPrev={posterModalIdx > 0}
          hasNext={posterModalIdx < posterMovies.length - 1}
          position={posterModalIdx + 1}
          total={posterMovies.length}
          onClose={() => setOpenPosterMovieId(null)}
          onPrev={() => setOpenPosterMovieId(posterMovies[posterModalIdx - 1].id)}
          onNext={() => setOpenPosterMovieId(posterMovies[posterModalIdx + 1].id)}
        />
      )}

      {backgroundModalMovie && (
        <ImageModal
          movie={backgroundModalMovie}
          imageUrl={`/api/movies/${backgroundModalMovie.id}/background?server_id=${selectedServerId}`}
          hasPrev={backgroundModalIdx > 0}
          hasNext={backgroundModalIdx < backgroundMovies.length - 1}
          position={backgroundModalIdx + 1}
          total={backgroundMovies.length}
          onClose={() => setOpenBackgroundMovieId(null)}
          onPrev={() => setOpenBackgroundMovieId(backgroundMovies[backgroundModalIdx - 1].id)}
          onNext={() => setOpenBackgroundMovieId(backgroundMovies[backgroundModalIdx + 1].id)}
        />
      )}

      {bulkEditOpen && selectedIds.size > 0 && (
        <BulkEditModal
          selectedMovies={visibleMovies.filter((m) => selectedIds.has(m.id))}
          onSave={handleBulkSave}
          onClose={() => setBulkEditOpen(false)}
        />
      )}
    </div>
  )
}
