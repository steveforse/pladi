import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MoviesTable from '@/components/MoviesTable'

vi.mock('@/hooks/useMoviesData', () => ({
  useMoviesData: vi.fn(),
}))
vi.mock('@/hooks/useMoviesFilter', () => ({
  useMoviesFilter: vi.fn(),
}))
vi.mock('@/hooks/useColumnManager', () => ({
  useColumnManager: vi.fn(),
}))
vi.mock('@/hooks/usePagination', () => ({
  usePagination: vi.fn(),
}))

vi.mock('@/components/movies/HamburgerMenu', () => ({
  HamburgerMenu: ({ onSettings }: { onSettings: () => void }) => <button onClick={onSettings}>menu-settings</button>,
}))
vi.mock('@/components/movies/WelcomeScreen', () => ({
  WelcomeScreen: () => <div>welcome-screen</div>,
}))
vi.mock('@/components/movies/FilterRow', () => ({
  FilterRow: ({ onChange, onRemove }: {
    onChange: (updated: { field: string; op: string; value: string }) => void
    onRemove: () => void
  }) => (
    <div>
      <button onClick={() => onChange({ field: 'title', op: 'includes', value: 'updated' })}>filter-change</button>
      <button onClick={onRemove}>filter-remove</button>
    </div>
  ),
}))
vi.mock('@/components/movies/ColumnPicker', () => ({
  ColumnPicker: () => <div>column-picker</div>,
}))
vi.mock('@/components/movies/Paginator', () => ({
  Paginator: ({ onPage, onPageSize, centerSlot, leftSlot }: {
    onPage: (p: number) => void
    onPageSize: (n: number) => void
    centerSlot?: React.ReactNode
    leftSlot?: React.ReactNode
  }) => (
    <div>
      <button onClick={() => onPage(2)}>paginator-page</button>
      <button onClick={() => onPageSize(50)}>paginator-size</button>
      {leftSlot}
      {centerSlot}
    </div>
  ),
}))
vi.mock('@/components/movies/MovieHeaderRow', () => ({
  MovieHeaderRow: ({ onToggleAll, onSort }: { onToggleAll: () => void; onSort: (key: string) => void }) => (
    <tr>
      <th>
        header-row
        <button onClick={onToggleAll}>toggle-all</button>
        <button onClick={() => onSort('title')}>sort-title</button>
      </th>
    </tr>
  ),
}))
vi.mock('@/components/movies/MovieRow', () => ({
  MovieRow: ({ movie, onToggle, onOpenPoster, onOpenBackground }: {
    movie: { id: string; title: string }
    onToggle: (id: string) => void
    onOpenPoster: (id: string) => void
    onOpenBackground: (id: string) => void
  }) => (
    <tr>
      <td>{movie.title}</td>
      <td><button onClick={() => onToggle(movie.id)}>row-toggle</button></td>
      <td><button onClick={() => onOpenPoster(movie.id)}>open-poster</button></td>
      <td><button onClick={() => onOpenBackground(movie.id)}>open-background</button></td>
    </tr>
  ),
}))
vi.mock('@/components/movies/PosterModal', () => ({
  PosterModal: ({ onPrev, onNext, onClose }: { onPrev: () => void; onNext: () => void; onClose: () => void }) => (
    <div>
      <div>poster-modal</div>
      <button onClick={onPrev}>poster-prev</button>
      <button onClick={onNext}>poster-next</button>
      <button onClick={onClose}>poster-close</button>
    </div>
  ),
}))
vi.mock('@/components/movies/ImageModal', () => ({
  ImageModal: ({ onPrev, onNext, onClose }: { onPrev: () => void; onNext: () => void; onClose: () => void }) => (
    <div>
      <div>image-modal</div>
      <button onClick={onPrev}>image-prev</button>
      <button onClick={onNext}>image-next</button>
      <button onClick={onClose}>image-close</button>
    </div>
  ),
}))
vi.mock('@/components/movies/BulkEditModal', () => ({
  BulkEditModal: ({ onSave, onClose }: {
    onSave: (tags: Partial<Record<'genres' | 'directors' | 'writers' | 'producers' | 'collections' | 'labels' | 'country', string[]>>, mode: 'append' | 'replace') => Promise<void>
    onClose: () => void
  }) => (
    <div>
      <button onClick={() => void onSave({ genres: ['Drama'] }, 'replace')}>bulk-save</button>
      <button onClick={() => void onSave({ genres: ['Drama'] }, 'append')}>bulk-save-append</button>
      <button onClick={onClose}>bulk-close</button>
    </div>
  ),
}))

import { useMoviesData } from '@/hooks/useMoviesData'
import { useMoviesFilter } from '@/hooks/useMoviesFilter'
import { useColumnManager } from '@/hooks/useColumnManager'
import { usePagination } from '@/hooks/usePagination'

const mockedMoviesData = vi.mocked(useMoviesData)
const mockedMoviesFilter = vi.mocked(useMoviesFilter)
const mockedColumnManager = vi.mocked(useColumnManager)
const mockedPagination = vi.mocked(usePagination)

function createStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
}

function setupHookMocks({
  moviesData,
  moviesFilter,
  columnManager,
  pagination,
}: {
  moviesData?: Partial<ReturnType<typeof useMoviesData>>
  moviesFilter?: Partial<ReturnType<typeof useMoviesFilter>>
  columnManager?: Partial<ReturnType<typeof useColumnManager>>
  pagination?: Partial<ReturnType<typeof usePagination>>
} = {}) {
  const baseData = {
    plexServers: [{ id: 1, name: 'Main' }],
    selectedServerId: 1,
    sections: [{ title: 'Movies', items: [{ id: 'm1', title: 'Alpha', file_path: '/x' }] }],
    selectedTitle: 'Movies',
    loading: false,
    refreshing: false,
    syncing: false,
    error: null,
    posterReady: new Set<string>(),
    uncachedPosterMovies: [],
    backgroundReady: new Set<string>(),
    uncachedBackgroundMovies: [],
    handleServerChange: vi.fn(),
    handleServerAdded: vi.fn(),
    setSelectedTitle: vi.fn(),
    warmPosters: vi.fn(),
    warmBackgrounds: vi.fn(),
    updateMovie: vi.fn(),
    refreshMovies: vi.fn(),
    ...moviesData,
  }
  const baseMovies = baseData.sections.flatMap((s) => s.items)
  const baseFilterState = {
    multiOnly: false,
    setMultiOnly: vi.fn(),
    unmatchedOnly: false,
    setUnmatchedOnly: vi.fn(),
    filenameMismatch: false,
    setFilenameMismatch: vi.fn(),
    originalTitleMismatch: false,
    setOriginalTitleMismatch: vi.fn(),
    noYearInPath: false,
    setNoYearInPath: vi.fn(),
    yearPathMismatch: false,
    setYearPathMismatch: vi.fn(),
    notInSubfolder: false,
    setNotInSubfolder: vi.fn(),
    sortKey: 'title',
    sortDir: 'asc',
    handleSort: vi.fn(),
    filters: [],
    addFilter: vi.fn(),
    updateFilter: vi.fn(),
    removeFilter: vi.fn(),
    clearAllFilters: vi.fn(),
    visibleMovies: baseMovies as never[],
    ...moviesFilter,
  }
  const baseColumnState = {
    visibleCols: new Set(['id', 'title'] as never[]),
    colOrder: ['title', 'id'] as never[],
    dragOverCol: null,
    handleColChange: vi.fn(),
    resetColumns: vi.fn(),
    handleColDragStart: vi.fn(),
    handleColDragOver: vi.fn(),
    handleColDrop: vi.fn(),
    handleColDragEnd: vi.fn(),
    ...columnManager,
  }
  const basePaginationState = {
    page: 1,
    setPage: vi.fn(),
    pageSize: 25,
    totalPages: 1,
    handlePageSize: vi.fn(),
    ...pagination,
  }

  mockedMoviesData.mockReturnValue(baseData)
  mockedMoviesFilter.mockReturnValue(baseFilterState)
  mockedColumnManager.mockReturnValue(baseColumnState)
  mockedPagination.mockReturnValue(basePaginationState)

  return { baseData, baseFilterState, baseColumnState, basePaginationState }
}

describe('MoviesTable', () => {
  beforeEach(() => {
    cleanup()
    vi.resetAllMocks()
    vi.stubGlobal('localStorage', createStorageMock())
  })

  it('renders loading skeleton', () => {
    setupHookMocks({ moviesData: { loading: true } })
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} onShows={() => {}} downloadImages={false} />)
    const pulseRows = screen.getAllByRole('generic').filter((el) => el.className.includes('animate-pulse'))
    expect(pulseRows).toHaveLength(8)
    view.unmount()
  })

  it('renders error state with settings action', async () => {
    const onSettings = vi.fn()
    setupHookMocks({ moviesData: { error: 'bad request' } })
    const view = render(<MoviesTable onLogout={() => {}} onSettings={onSettings} onHistory={() => {}} onShows={() => {}} downloadImages={false} />)

    expect(screen.getByText('Failed to load movies: bad request')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onSettings).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('renders welcome screen when no servers exist', () => {
    setupHookMocks({ moviesData: { plexServers: [] } })
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} onShows={() => {}} downloadImages={false} />)
    expect(screen.getByText('welcome-screen')).toBeInTheDocument()
    view.unmount()
  })

  it('renders main table state', () => {
    setupHookMocks({
      moviesData: {
        sections: [{
          title: 'Movies',
          items: [
            { id: 'm1', title: 'Alpha', file_path: '/x', size: 2_147_483_648, duration: 7_200_000, year: 2024, originally_available: '2024-01-01', added_at: 1_722_470_400, view_count: 1 },
            { id: 'm2', title: 'Beta', file_path: '/y', size: 1_073_741_824, duration: 5_400_000, year: 1984, originally_available: '1984-06-08', added_at: 1_704_067_200, view_count: 0 },
          ],
        }],
      },
    })
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} onShows={() => {}} downloadImages={false} />)
    expect(screen.getAllByRole('button', { name: 'paginator-page' })).toHaveLength(2)
    expect(screen.getByText('header-row')).toBeInTheDocument()
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0)
    expect(screen.getByRole('region', { name: 'Movie statistics' })).toBeInTheDocument()
    expect(screen.getByText('Statistics For Movies')).toBeInTheDocument()
    expect(screen.getByText('3.00 GB')).toBeInTheDocument()
    expect(screen.getByText('1 / 2 (50%)')).toBeInTheDocument()
    expect(screen.getByText('Beta (1-1-2024)')).toBeInTheDocument()
    expect(screen.getByText('Alpha (8-1-2024)')).toBeInTheDocument()
    view.unmount()
  })

  it('toggles filters panel and writes localStorage state', async () => {
    const setItemSpy = vi.spyOn(globalThis.localStorage, 'setItem')
    setupHookMocks()
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} onShows={() => {}} downloadImages={false} />)

    await userEvent.click(screen.getAllByRole('button', { name: /Filters/ })[0])
    expect(setItemSpy).toHaveBeenCalledWith('pladi_filters_open', 'true')
    expect(screen.getByText('Quick filters')).toBeInTheDocument()
    view.unmount()
  })

  it('wires paginator controls and opens image modals from row actions', async () => {
    const { basePaginationState } = setupHookMocks({
      moviesData: {
        posterReady: new Set(['m1']),
        backgroundReady: new Set(['m1']),
      },
    })
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} onShows={() => {}} downloadImages={true} />)

    await userEvent.click(screen.getAllByRole('button', { name: 'paginator-page' })[0])
    await userEvent.click(screen.getAllByRole('button', { name: 'paginator-size' })[0])
    expect(basePaginationState.setPage).toHaveBeenCalledWith(2)
    expect(basePaginationState.handlePageSize).toHaveBeenCalledWith(50)

    await userEvent.click(screen.getByRole('button', { name: 'open-poster' }))
    await userEvent.click(screen.getByRole('button', { name: 'open-background' }))
    expect(screen.getByText('poster-modal')).toBeInTheDocument()
    expect(screen.getByText('image-modal')).toBeInTheDocument()
    view.unmount()
  })

  it('handles selection and bulk save flow', async () => {
    const { baseData } = setupHookMocks()
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} onShows={() => {}} downloadImages={false} />)

    await userEvent.click(screen.getAllByRole('button', { name: 'row-toggle' })[0])
    expect(screen.getByRole('button', { name: 'Bulk Edit (1)' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Bulk Edit (1)' }))
    await userEvent.click(screen.getByRole('button', { name: 'bulk-save' }))

    await waitFor(() => expect(baseData.updateMovie).toHaveBeenCalledWith(
      { id: 'm1', file_path: '/x' },
      { genres: 'Drama' }
    ))
    await waitFor(() => expect(baseData.refreshMovies).toHaveBeenCalledWith([
      { id: 'm1', title: 'Alpha', file_path: '/x' },
    ]))
    view.unmount()
  })

  it('wires server/library selectors, quick filters, advanced filters, and clear all', async () => {
    const { baseData, baseFilterState } = setupHookMocks({
      moviesData: {
        plexServers: [{ id: 1, name: 'Main' }, { id: 2, name: 'Backup' }],
        sections: [
          { title: 'Movies', items: [{ id: 'm1', title: 'Alpha', file_path: '/x' }] },
          { title: 'Shows', items: [] },
        ],
      },
      moviesFilter: {
        filters: [{ id: 99, field: 'title', op: 'includes', value: 'alpha' }],
      },
    })
    const onShows = vi.fn()
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} onShows={onShows} downloadImages={false} />)

    const [serverSelect, libraryTypeSelect, librarySelect] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(serverSelect, '2')
    expect(baseData.handleServerChange).toHaveBeenCalledWith(2)

    await userEvent.selectOptions(libraryTypeSelect, 'shows')
    expect(onShows).toHaveBeenCalledTimes(1)

    await userEvent.selectOptions(librarySelect, 'Shows')
    expect(baseData.setSelectedTitle).toHaveBeenCalledWith('Shows')

    await userEvent.click(screen.getByRole('button', { name: /Filters/ }))

    await userEvent.click(screen.getByRole('checkbox', { name: 'Mismatches file path' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mismatches filename' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mismatches Original Title' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Missing from file path' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'File path mismatches metadata' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Multiple files only' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Not in movie subfolder' }))

    expect(baseFilterState.setUnmatchedOnly).toHaveBeenCalledWith(true)
    expect(baseFilterState.setFilenameMismatch).toHaveBeenCalledWith(true)
    expect(baseFilterState.setOriginalTitleMismatch).toHaveBeenCalledWith(true)
    expect(baseFilterState.setNoYearInPath).toHaveBeenCalledWith(true)
    expect(baseFilterState.setYearPathMismatch).toHaveBeenCalledWith(true)
    expect(baseFilterState.setMultiOnly).toHaveBeenCalledWith(true)
    expect(baseFilterState.setNotInSubfolder).toHaveBeenCalledWith(true)

    await userEvent.click(screen.getByRole('button', { name: '+ Add Filter' }))
    expect(baseFilterState.addFilter).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'filter-change' }))
    expect(baseFilterState.updateFilter).toHaveBeenCalledWith(99, { field: 'title', op: 'includes', value: 'updated' })

    await userEvent.click(screen.getByRole('button', { name: 'filter-remove' }))
    expect(baseFilterState.removeFilter).toHaveBeenCalledWith(99)

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(baseFilterState.clearAllFilters).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'sort-title' }))
    expect(baseFilterState.handleSort).toHaveBeenCalledWith('title')
    view.unmount()
  })

  it('handles modal navigation callbacks and append bulk edit mode', async () => {
    const { baseData } = setupHookMocks({
      moviesData: {
        sections: [{
          title: 'Movies',
          items: [
            { id: 'm1', title: 'Alpha', file_path: '/x', genres: 'Drama' },
            { id: 'm2', title: 'Beta', file_path: '/y', genres: 'Drama, Comedy' },
          ],
        }],
        posterReady: new Set(['m1', 'm2']),
        backgroundReady: new Set(['m1', 'm2']),
      },
    })

    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} onShows={() => {}} downloadImages={true} />)

    await userEvent.click(screen.getAllByRole('button', { name: 'row-toggle' })[0])
    await userEvent.click(screen.getByRole('button', { name: 'Bulk Edit (1)' }))
    await userEvent.click(screen.getByRole('button', { name: 'bulk-save-append' }))
    await waitFor(() => expect(baseData.updateMovie).toHaveBeenCalledWith(
      { id: 'm1', file_path: '/x' },
      { genres: 'Drama' }
    ))

    await userEvent.click(screen.getAllByRole('button', { name: 'open-poster' })[0])
    await userEvent.click(screen.getByRole('button', { name: 'poster-next' }))
    await userEvent.click(screen.getByRole('button', { name: 'poster-prev' }))
    await userEvent.click(screen.getByRole('button', { name: 'poster-close' }))

    await userEvent.click(screen.getAllByRole('button', { name: 'open-background' })[0])
    await userEvent.click(screen.getByRole('button', { name: 'image-next' }))
    await userEvent.click(screen.getByRole('button', { name: 'image-prev' }))
    await userEvent.click(screen.getByRole('button', { name: 'image-close' }))
    view.unmount()
  })

  it('warms poster/background caches when syncing transitions to complete', () => {
    const warmPosters = vi.fn()
    const warmBackgrounds = vi.fn()
    const sharedMovies = [{ id: 'm1', title: 'Alpha', file_path: '/x' }]

    mockedMoviesData
      .mockReturnValueOnce({
        ...setupHookMocks().baseData,
        syncing: true,
        uncachedPosterMovies: ['m1'],
        uncachedBackgroundMovies: ['m1'],
        warmPosters,
        warmBackgrounds,
      })
      .mockReturnValueOnce({
        ...setupHookMocks().baseData,
        sections: [{ title: 'Movies', items: sharedMovies }],
        syncing: false,
        uncachedPosterMovies: ['m1'],
        uncachedBackgroundMovies: ['m1'],
        warmPosters,
        warmBackgrounds,
      })

    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} onShows={() => {}} downloadImages={true} />)
    view.rerender(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} onShows={() => {}} downloadImages={true} />)

    expect(warmPosters).toHaveBeenCalledWith(['m1'])
    expect(warmBackgrounds).toHaveBeenCalledWith(['m1'])
    view.unmount()
  })
})
