import React, { useEffect, useMemo, useRef, useState } from 'react'

interface Movie {
  title: string
  year: number | null
  file_path: string | null
  container: string | null
  video_codec: string | null
  bitrate: number | null
  size: number | null
  duration: number | null
  plex_url: string | null
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return '—'
  const gb = bytes / 1_073_741_824
  return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / 1_048_576).toFixed(0)} MB`
}

function formatBitrate(kbps: number | null): string {
  if (kbps == null) return '—'
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${kbps} kbps`
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—'
  const totalMin = Math.round(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

interface Section {
  title: string
  movies: Movie[]
}

type SortKey = keyof Pick<Movie, 'title' | 'year' | 'container' | 'video_codec' | 'bitrate' | 'size' | 'duration'>
type SortDir = 'asc' | 'desc'

type ColumnId = 'year' | 'file_path' | 'container' | 'video_codec' | 'bitrate' | 'size' | 'duration' | 'play'

interface ColumnDef {
  id: ColumnId
  label: string
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: 'year', label: 'Year' },
  { id: 'file_path', label: 'File Path' },
  { id: 'container', label: 'Container' },
  { id: 'video_codec', label: 'Codec' },
  { id: 'bitrate', label: 'Bitrate' },
  { id: 'size', label: 'Size' },
  { id: 'duration', label: 'Duration' },
  { id: 'play', label: 'Play' },
]

function sortMovies(movies: Movie[], key: SortKey, dir: SortDir): Movie[] {
  return [...movies].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    let cmp: number
    if (av == null && bv == null) cmp = 0
    else if (av == null) cmp = 1
    else if (bv == null) cmp = -1
    else if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv)
    else cmp = (av as number) - (bv as number)
    return dir === 'asc' ? cmp : -cmp
  })
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-muted-foreground/40">↕</span>
  return <span className="ml-1 text-primary">{dir === 'asc' ? '↑' : '↓'}</span>
}

function ColumnPicker({
  columns,
  visible,
  onChange,
}: {
  columns: ColumnDef[]
  visible: Set<ColumnId>
  onChange: (id: ColumnId, checked: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="border rounded px-3 py-1.5 text-sm bg-background hover:bg-muted/50 flex items-center gap-1.5"
      >
        Columns
        <span className="text-muted-foreground text-xs">({visible.size}/{columns.length})</span>
        <span className="text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 bg-card border rounded-md shadow-lg p-2 min-w-36">
          {columns.map((col) => (
            <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={visible.has(col.id)}
                onChange={(e) => onChange(col.id, e.target.checked)}
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MoviesTable() {
  const [sections, setSections] = useState<Section[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [multiOnly, setMultiOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(
    new Set(ALL_COLUMNS.map((c) => c.id))
  )

  useEffect(() => {
    fetch('/api/movies')
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        return res.json()
      })
      .then((data: Section[]) => {
        setSections(data)
        if (data.length > 0) setSelectedTitle(data[0].title)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const activeSection = sections.find((s) => s.title === selectedTitle)

  const visibleMovies = useMemo(() => {
    if (!activeSection) return []
    let movies = activeSection.movies
    if (multiOnly) {
      const counts = new Map<string, number>()
      for (const m of movies) {
        const key = `${m.title}__${m.year}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      movies = movies.filter((m) => (counts.get(`${m.title}__${m.year}`) ?? 0) > 1)
    }
    return sortMovies(movies, sortKey, sortDir)
  }, [activeSection, multiOnly, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function handleColChange(id: ColumnId, checked: boolean) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function col(id: ColumnId) { return visibleCols.has(id) }

  function Th({ label, col: c, className }: { label: string; col: SortKey; className?: string }) {
    return (
      <th
        className={`px-4 py-3 text-left font-medium whitespace-nowrap cursor-pointer select-none hover:bg-muted/70 ${className ?? ''}`}
        onClick={() => handleSort(c)}
      >
        {label}<SortIcon active={sortKey === c} dir={sortDir} />
      </th>
    )
  }

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
      <div className="p-8 text-destructive">
        Failed to load movies: {error}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Plex Movie Library</h1>
        <select
          value={selectedTitle ?? ''}
          onChange={(e) => setSelectedTitle(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm bg-background"
        >
          {sections.map((s) => (
            <option key={s.title} value={s.title}>{s.title}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={multiOnly}
            onChange={(e) => setMultiOnly(e.target.checked)}
          />
          Multiple files only
        </label>
        <ColumnPicker columns={ALL_COLUMNS} visible={visibleCols} onChange={handleColChange} />
      </div>

      {activeSection && (
        <div>
          <div className="rounded-md border overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <Th label="Title" col="title" className="w-56" />
                  {col('year') && <Th label="Year" col="year" />}
                  {col('file_path') && <th className="px-4 py-3 text-left font-medium">File Path</th>}
                  {col('container') && <Th label="Container" col="container" />}
                  {col('video_codec') && <Th label="Codec" col="video_codec" />}
                  {col('bitrate') && <Th label="Bitrate" col="bitrate" />}
                  {col('size') && <Th label="Size" col="size" />}
                  {col('duration') && <Th label="Duration" col="duration" />}
                  {col('play') && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {visibleMovies.map((movie, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium whitespace-nowrap">{movie.title}</td>
                    {col('year') && <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.year ?? '—'}</td>}
                    {col('file_path') && (
                      <td className="px-4 py-2 text-muted-foreground font-mono text-xs break-all">
                        {movie.file_path ?? <span className="italic">—</span>}
                      </td>
                    )}
                    {col('container') && (
                      <td className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">
                        {movie.container ?? '—'}
                      </td>
                    )}
                    {col('video_codec') && (
                      <td className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">
                        {movie.video_codec ?? '—'}
                      </td>
                    )}
                    {col('bitrate') && (
                      <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                        {formatBitrate(movie.bitrate)}
                      </td>
                    )}
                    {col('size') && (
                      <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                        {formatSize(movie.size)}
                      </td>
                    )}
                    {col('duration') && (
                      <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDuration(movie.duration)}
                      </td>
                    )}
                    {col('play') && (
                      <td className="px-4 py-2 whitespace-nowrap">
                        {movie.plex_url && (
                          <a href={movie.plex_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                            Play
                          </a>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{visibleMovies.length} movies</p>
        </div>
      )}
    </div>
  )
}
