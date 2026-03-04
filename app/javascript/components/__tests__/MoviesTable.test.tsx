import React from 'react'
import { render, screen } from '@testing-library/react'
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
  Paginator: () => <div>paginator</div>,
}))
vi.mock('@/components/movies/MovieHeaderRow', () => ({
  MovieHeaderRow: () => <tr><th>header-row</th></tr>,
}))
vi.mock('@/components/movies/MovieRow', () => ({
  MovieRow: ({ movie }: { movie: { title: string } }) => <tr><td>{movie.title}</td></tr>,
}))
vi.mock('@/components/movies/PosterModal', () => ({
  PosterModal: () => <div>poster-modal</div>,
}))
vi.mock('@/components/movies/ImageModal', () => ({
  ImageModal: () => <div>image-modal</div>,
}))
vi.mock('@/components/movies/BulkEditModal', () => ({
  BulkEditModal: () => <div>bulk-edit-modal</div>,
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

function setupHookMocks(overrides?: Partial<ReturnType<typeof useMoviesData>>) {
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
    ...overrides,
  }

  mockedMoviesData.mockReturnValue(baseData)
  mockedMoviesFilter.mockReturnValue({
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
    visibleMovies: baseData.sections.flatMap((s) => s.movies) as never[],
  })
  mockedColumnManager.mockReturnValue({
    visibleCols: new Set(['id', 'title'] as never[]),
    colOrder: ['title', 'id'] as never[],
    dragOverCol: null,
    handleColChange: vi.fn(),
    resetColumns: vi.fn(),
    handleColDragStart: vi.fn(),
    handleColDragOver: vi.fn(),
    handleColDrop: vi.fn(),
    handleColDragEnd: vi.fn(),
  })
  mockedPagination.mockReturnValue({
    page: 1,
    setPage: vi.fn(),
    pageSize: 25,
    totalPages: 1,
    handlePageSize: vi.fn(),
  })
}

describe('MoviesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', createStorageMock())
  })

  it('renders loading skeleton', () => {
    setupHookMocks({ loading: true })
    render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} downloadImages={false} />)
    const pulseRows = screen.getAllByRole('generic').filter((el) => el.className.includes('animate-pulse'))
    expect(pulseRows).toHaveLength(8)
  })

  it('renders error state with settings action', async () => {
    const onSettings = vi.fn()
    setupHookMocks({ error: 'bad request' })
    render(<MoviesTable onLogout={() => {}} onSettings={onSettings} onHistory={() => {}} downloadImages={false} />)

    expect(screen.getByText('Failed to load movies: bad request')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onSettings).toHaveBeenCalledTimes(1)
  })

  it('renders welcome screen when no servers exist', () => {
    setupHookMocks({ plexServers: [] })
    render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} downloadImages={false} />)
    expect(screen.getByText('welcome-screen')).toBeInTheDocument()
  })

  it('renders main table state', () => {
    setupHookMocks()
    render(<MoviesTable onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} downloadImages={false} />)
    expect(screen.getAllByText('paginator').length).toBe(2)
    expect(screen.getByText('header-row')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })
})
