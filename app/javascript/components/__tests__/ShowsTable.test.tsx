import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShowsTable from '@/components/ShowsTable'
import { useShowsData } from '@/hooks/useShowsData'

vi.mock('@/hooks/useShowsData', () => ({
  useShowsData: vi.fn(),
}))

vi.mock('@/components/movies/HamburgerMenu', () => ({
  HamburgerMenu: ({ onSettings }: { onSettings: () => void }) => (
    <button onClick={onSettings}>menu-settings</button>
  ),
}))

const mockedUseShowsData = vi.mocked(useShowsData)

function setupHookMock(overrides: Partial<ReturnType<typeof useShowsData>> = {}) {
  mockedUseShowsData.mockReturnValue({
    plexServers: [{ id: 1, name: 'Main', url: 'http://plex.local' }],
    selectedServerId: 1,
    sections: [{ title: 'TV Shows', movies: [{ id: 's1', title: 'Severance', year: 2022, season_count: 2, episode_count: 19, viewed_episode_count: 8, studio: 'Apple', genres: 'Drama', summary: 'A workplace mystery.', file_path: null }] }],
    selectedTitle: 'TV Shows',
    loading: false,
    refreshing: false,
    syncing: false,
    error: null,
    handleServerChange: vi.fn(),
    handleLibraryChange: vi.fn(),
    updateShow: vi.fn(),
    ...overrides,
  })
}

function createStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
}

describe('ShowsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', createStorageMock())
    vi.stubGlobal('sessionStorage', createStorageMock())
  })

  it('renders loading skeleton', () => {
    setupHookMock({ loading: true })
    render(<ShowsTable onMovies={() => {}} onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} />)
    const pulseRows = screen.getAllByRole('generic').filter((el) => el.className.includes('animate-pulse'))
    expect(pulseRows).toHaveLength(8)
  })

  it('renders error state and settings action', async () => {
    const onSettings = vi.fn()
    setupHookMock({ error: 'bad request' })
    render(<ShowsTable onMovies={() => {}} onLogout={() => {}} onSettings={onSettings} onHistory={() => {}} />)
    expect(screen.getByText('Failed to load TV shows: bad request')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open Settings' }))
    expect(onSettings).toHaveBeenCalledTimes(1)
  })

  it('renders empty-server message', () => {
    setupHookMock({ plexServers: [] })
    render(<ShowsTable onMovies={() => {}} onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} />)
    expect(screen.getByText('Add a Plex server in Settings to browse TV libraries.')).toBeInTheDocument()
  })

  it('renders shows list and allows switching back to movies', async () => {
    const onMovies = vi.fn()
    setupHookMock()
    const view = render(<ShowsTable onMovies={onMovies} onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} />)

    expect(screen.getByText('Severance')).toBeInTheDocument()
    await userEvent.click(within(view.container).getByRole('button', { name: 'Switch to Movies' }))
    expect(onMovies).toHaveBeenCalledTimes(1)
  })

  it('filters shows by title using advanced filters', async () => {
    setupHookMock({
      sections: [
        {
          title: 'TV Shows',
          movies: [
            { id: 's1', title: 'Severance', year: 2022, season_count: 2, episode_count: 19, viewed_episode_count: 8, studio: 'Apple', genres: 'Drama', summary: 'A workplace mystery.', file_path: null },
            { id: 's2', title: 'The Bear', year: 2023, season_count: 3, episode_count: 28, viewed_episode_count: 28, studio: 'FX', genres: 'Comedy', summary: 'A chef returns home.', file_path: null },
          ],
        },
      ],
    })

    const view = render(<ShowsTable onMovies={() => {}} onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} />)
    await userEvent.click(within(view.container).getByRole('button', { name: 'Filters' }))
    await userEvent.click(within(view.container).getByRole('button', { name: '+ Add Filter' }))
    await userEvent.type(within(view.container).getByPlaceholderText('value'), 'bear')

    expect(within(view.container).queryByText('Severance')).not.toBeInTheDocument()
    expect(within(view.container).getByText('The Bear')).toBeInTheDocument()
  })

  it('sorts shows by episode count from table header', async () => {
    setupHookMock({
      sections: [
        {
          title: 'TV Shows',
          movies: [
            { id: 's1', title: 'Severance', year: 2022, season_count: 2, episode_count: 19, viewed_episode_count: 8, studio: 'Apple', genres: 'Drama', summary: 'A workplace mystery.', file_path: null },
            { id: 's2', title: 'The Bear', year: 2023, season_count: 3, episode_count: 28, viewed_episode_count: 28, studio: 'FX', genres: 'Comedy', summary: 'A chef returns home.', file_path: null },
          ],
        },
      ],
    })

    const view = render(<ShowsTable onMovies={() => {}} onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} />)

    await userEvent.click(within(view.container).getByText('Episodes'))
    const rows = within(view.container).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Severance')

    await userEvent.click(within(view.container).getByText('Episodes'))
    const sortedDescRows = within(view.container).getAllByRole('row')
    expect(sortedDescRows[1]).toHaveTextContent('The Bear')
  })

  it('filters shows by advanced filter rows', async () => {
    setupHookMock({
      sections: [
        {
          title: 'TV Shows',
          movies: [
            { id: 's1', title: 'Severance', year: 2022, season_count: 2, episode_count: 19, viewed_episode_count: 8, studio: 'Apple', genres: 'Drama', summary: 'A workplace mystery.', file_path: null },
            { id: 's2', title: 'The Bear', year: 2023, season_count: 3, episode_count: 28, viewed_episode_count: 28, studio: 'FX', genres: 'Comedy', summary: 'A chef returns home.', file_path: null },
          ],
        },
      ],
    })

    const view = render(<ShowsTable onMovies={() => {}} onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} />)
    await userEvent.click(within(view.container).getByRole('button', { name: 'Filters' }))
    await userEvent.click(within(view.container).getByRole('button', { name: '+ Add Filter' }))
    await userEvent.type(within(view.container).getByPlaceholderText('value'), 'bear')

    expect(within(view.container).queryByText('Severance')).not.toBeInTheDocument()
    expect(within(view.container).getByText('The Bear')).toBeInTheDocument()
  })

  it('applies quick filters for unwatched shows', async () => {
    setupHookMock({
      sections: [
        {
          title: 'TV Shows',
          movies: [
            { id: 's1', title: 'Severance', year: 2022, season_count: 2, episode_count: 19, viewed_episode_count: 8, studio: 'Apple', genres: 'Drama', summary: 'A workplace mystery.', thumb: '/thumb.jpg', file_path: null },
            { id: 's2', title: 'The Bear', year: 2023, season_count: 3, episode_count: 28, viewed_episode_count: 0, studio: 'FX', genres: 'Comedy', summary: 'A chef returns home.', thumb: null, file_path: null },
          ],
        },
      ],
    })

    const view = render(<ShowsTable onMovies={() => {}} onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} />)
    await userEvent.click(within(view.container).getByRole('button', { name: 'Filters' }))
    await userEvent.click(within(view.container).getByRole('checkbox', { name: 'Unwatched only' }))

    expect(within(view.container).queryByText('Severance')).not.toBeInTheDocument()
    expect(within(view.container).getByText('The Bear')).toBeInTheDocument()
  })

  it('toggles TV table columns from the column picker', async () => {
    setupHookMock()
    const view = render(<ShowsTable onMovies={() => {}} onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} />)

    expect(within(view.container).getByRole('columnheader', { name: /Summary/ })).toBeInTheDocument()
    await userEvent.click(within(view.container).getByRole('button', { name: /Toggle Columns/i }))
    expect(within(view.container).getByRole('checkbox', { name: 'Content Rating' })).toBeInTheDocument()
    await userEvent.click(within(view.container).getByRole('checkbox', { name: 'Summary' }))

    expect(within(view.container).queryByRole('columnheader', { name: /Summary/ })).not.toBeInTheDocument()
  })

  it('reorders columns via drag and drop and persists order', async () => {
    setupHookMock()
    const view = render(<ShowsTable onMovies={() => {}} onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} />)

    const idHeader = within(view.container).getByRole('columnheader', { name: /ID/ })
    const yearDragHandle = within(view.container).getByLabelText('Drag Year column')

    fireEvent.dragStart(yearDragHandle)
    fireEvent.dragOver(idHeader)
    fireEvent.drop(idHeader)
    fireEvent.dragEnd(yearDragHandle)

    let reorderedHeaders = within(view.container).getAllByRole('columnheader')
    expect(reorderedHeaders[0]).toHaveTextContent('Year')

    view.unmount()

    const utils = render(<ShowsTable onMovies={() => {}} onLogout={() => {}} onSettings={() => {}} onHistory={() => {}} />)
    reorderedHeaders = within(utils.container).getAllByRole('columnheader')
    expect(reorderedHeaders[0]).toHaveTextContent('Year')
  })
})
