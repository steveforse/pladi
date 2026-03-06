import React, { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import LibraryPageHeader from '@/components/LibraryPageHeader'
import LibrarySelectors from '@/components/LibrarySelectors'
import { BulkEditModal } from '@/components/movies/BulkEditModal'
import { ImageModal } from '@/components/movies/ImageModal'
import ShowFiltersPanel from '@/components/shows/ShowsFiltersPanel'
import ShowsTableGrid from '@/components/shows/ShowsTableGrid'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { useBulkTagEdit } from '@/hooks/useBulkTagEdit'
import { useRouteSync } from '@/hooks/useRouteSync'
import { useShowsData } from '@/hooks/useShowsData'
import { useShowsTableState } from '@/hooks/useShowsTableState'
import { loadStoredString } from '@/lib/storage'
import type { ShowsViewMode } from '@/hooks/useShowsData'

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
  const [openPosterShowId, setOpenPosterShowId] = useState<string | null>(null)
  const [openBackgroundShowId, setOpenBackgroundShowId] = useState<string | null>(null)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ShowsViewMode>(() => {
    if (initialViewMode) return initialViewMode
    return loadStoredString('local', 'pladi.shows.view_mode', 'shows') === 'episodes' ? 'episodes' : 'shows'
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
  const tableState = useShowsTableState({ sections, selectedTitle, viewMode })

  const {
    selectedIds,
    allSelected,
    someSelected,
    toggleAll: handleToggleAll,
    toggleRow: handleToggleRow,
    clearSelection,
  } = useBulkSelection({ pageItems: tableState.pagedShows, visibleItems: tableState.filteredShows })

  const { handleBulkSave } = useBulkTagEdit({
    rows: tableState.filteredShows,
    selectedIds,
    updateItem: async (id, patch) => updateShow(id, patch),
    onComplete: () => {
      clearSelection()
      setBulkEditOpen(false)
    },
  })

  const posterShows = downloadImages ? tableState.filteredShows.filter((show) => show.thumb) : []
  const posterModalIdx = openPosterShowId ? posterShows.findIndex((show) => show.id === openPosterShowId) : -1
  const posterModalShow = posterModalIdx >= 0 ? posterShows[posterModalIdx] : null
  const backgroundShows = downloadImages ? tableState.filteredShows.filter((show) => show.art) : []
  const backgroundModalIdx = openBackgroundShowId ? backgroundShows.findIndex((show) => show.id === openBackgroundShowId) : -1
  const backgroundModalShow = backgroundModalIdx >= 0 ? backgroundShows[backgroundModalIdx] : null

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
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <LibraryPageHeader
          syncing={false}
          syncingLabel={null}
          refreshing={false}
          onLogout={onLogout}
          onSettings={onSettings}
          onHistory={onHistory}
        />
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
        <LibraryPageHeader
          syncing={false}
          syncingLabel={null}
          refreshing={false}
          onLogout={onLogout}
          onSettings={onSettings}
          onHistory={onHistory}
        />
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
      <LibraryPageHeader
        syncing={syncing}
        syncingLabel={(
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border" style={{ backgroundColor: '#E5A00D15', borderColor: '#E5A00D50', color: '#E5A00D' }}>
            <Loader2 size={12} className="animate-spin" />
            Syncing
          </span>
        )}
        refreshing={refreshing}
        onLogout={onLogout}
        onSettings={onSettings}
        onHistory={onHistory}
      />

      <div className="px-8 space-y-4">
        <LibrarySelectors
          servers={plexServers}
          selectedServerId={selectedServerId}
          onServerChange={handleServerChange}
          libraryType="shows"
          onLibraryTypeChange={(type) => {
            if (type === 'movies') onMovies()
          }}
          selectedLibrary={selectedTitle}
          libraries={sections}
          onLibraryChange={handleLibraryChange}
        >
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">TV Mode:</label>
            <select
              aria-label="TV Mode"
              value={viewMode}
              onChange={(event) => {
                clearSelection()
                const nextMode = event.target.value as ShowsViewMode
                tableState.handleViewModeChange(nextMode)
                setViewMode(nextMode)
              }}
              className="border rounded px-3 py-1.5 text-sm bg-background"
            >
              <option value="shows">Shows</option>
              <option value="episodes">Episodes</option>
            </select>
          </div>
        </LibrarySelectors>

        <ShowFiltersPanel
          viewMode={viewMode}
          filtersOpen={tableState.filtersOpen}
          activeFilterCount={tableState.activeFilterCount}
          quickFilters={tableState.quickFilters}
          onQuickFilterChange={(key, value) => tableState.setQuickFilter(key as keyof typeof tableState.quickFilters, value)}
          filters={tableState.filters}
          onToggleOpen={tableState.toggleFiltersOpen}
          onAddFilter={tableState.addFilter}
          onUpdateFilter={tableState.updateFilter}
          onRemoveFilter={tableState.removeFilter}
          onClearAll={tableState.clearAllFilters}
          fieldDefs={tableState.filterFields}
          fieldGroups={tableState.filterFieldGroups}
        />

        <ShowsTableGrid
          viewMode={viewMode}
          filteredShows={tableState.filteredShows}
          pagedShows={tableState.pagedShows}
          page={tableState.page}
          totalPages={tableState.totalPages}
          pageSize={tableState.pageSize}
          onPage={tableState.setPage}
          onPageSize={tableState.handlePageSize}
          visibleCols={tableState.visibleCols}
          colOrder={tableState.colOrder}
          dragOverCol={tableState.dragOverCol}
          sortKey={tableState.sortKey}
          sortDir={tableState.sortDir}
          colWidths={tableState.colWidths}
          selectedIds={selectedIds}
          allSelected={allSelected}
          someSelected={someSelected}
          downloadImages={downloadImages}
          selectedServerId={selectedServerId}
          onToggleAll={handleToggleAll}
          onToggleRow={handleToggleRow}
          onSort={tableState.handleSort}
          onResetColumns={tableState.resetColumns}
          onColumnChange={tableState.handleColChange}
          onDragStart={tableState.handleColDragStart}
          onDragOver={tableState.handleColDragOver}
          onDrop={tableState.handleColDrop}
          onDragEnd={tableState.handleColDragEnd}
          onResizeStart={tableState.startResize}
          onOpenBulkEdit={() => setBulkEditOpen(true)}
          onClearSelection={clearSelection}
          onUpdateShow={updateShow}
          onOpenPoster={setOpenPosterShowId}
          onOpenBackground={setOpenBackgroundShowId}
        />
      </div>

      {bulkEditOpen && selectedIds.size > 0 && (
        <BulkEditModal
          selectedItems={tableState.filteredShows.filter((show) => selectedIds.has(show.id))}
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
