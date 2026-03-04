import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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
  FilterRow: () => <div>filter-row</div>,
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
  MovieHeaderRow: ({ onToggleAll }: { onToggleAll: () => void }) => (
    <tr>
      <th>
        header-row
        <button onClick={onToggleAll}>toggle-all</button>
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
  PosterModal: () => <div>poster-modal</div>,
}))
vi.mock('@/components/movies/ImageModal', () => ({
  ImageModal: () => <div>image-modal</div>,
}))
vi.mock('@/components/movies/BulkEditModal', () => ({
  BulkEditModal: ({ onSave, onClose }: {
    onSave: (tags: Partial<Record<'genres' | 'directors' | 'writers' | 'producers' | 'collections' | 'labels' | 'country', string[]>>, mode: 'append' | 'replace') => Promise<void>
    onClose: () => void
  }) => (
    <div>
      <button onClick={() => void onSave({ genres: ['Drama'] }, 'replace')}>bulk-save</button>
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
    sections: [{ title: 'Movies', movies: [{ id: 'm1', title: 'Alpha', file_path: '/x' }] }],
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
  const baseMovies = baseData.sections.flatMap((s) => s.movies)
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
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', createStorageMock())
  })

  it('renders loading skeleton', () => {
    setupHookMocks({ moviesData: { loading: true } })
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} downloadImages={false} />)
    const pulseRows = screen.getAllByRole('generic').filter((el) => el.className.includes('animate-pulse'))
    expect(pulseRows).toHaveLength(8)
    view.unmount()
  })

  it('renders error state with settings action', async () => {
    const onSettings = vi.fn()
    setupHookMocks({ moviesData: { error: 'bad request' } })
    const view = render(<MoviesTable onLogout={() => {}} onSettings={onSettings} onHistory={() => {}} downloadImages={false} />)

    expect(screen.getByText('Failed to load movies: bad request')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onSettings).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('renders welcome screen when no servers exist', () => {
    setupHookMocks({ moviesData: { plexServers: [] } })
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} downloadImages={false} />)
    expect(screen.getByText('welcome-screen')).toBeInTheDocument()
    view.unmount()
  })

  it('renders main table state', () => {
    setupHookMocks()
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} downloadImages={false} />)
    expect(screen.getAllByRole('button', { name: 'paginator-page' })).toHaveLength(2)
    expect(screen.getByText('header-row')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    view.unmount()
  })

  it('toggles filters panel and writes localStorage state', async () => {
    const setItemSpy = vi.spyOn(globalThis.localStorage, 'setItem')
    setupHookMocks()
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} downloadImages={false} />)

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
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} downloadImages={true} />)

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
    const view = render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} downloadImages={false} />)

    await userEvent.click(screen.getByRole('button', { name: 'row-toggle' }))
    expect(screen.getByRole('button', { name: 'Bulk Edit (1)' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Bulk Edit (1)' }))
    await userEvent.click(screen.getByRole('button', { name: 'bulk-save' }))

    await waitFor(() => expect(baseData.updateMovie).toHaveBeenCalledWith('m1', { genres: 'Drama' }))
    await waitFor(() => expect(baseData.refreshMovies).toHaveBeenCalledWith(['m1']))
    view.unmount()
  })
})
