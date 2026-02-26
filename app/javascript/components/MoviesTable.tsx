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

type SortKey = keyof Pick<Movie, 'title' | 'year' | 'file_path' | 'container' | 'video_codec' | 'bitrate' | 'size' | 'duration'>
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

// ── Filter types ────────────────────────────────────────────────────────────

type NumericOp = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
type StringOp = 'includes' | 'excludes' | 'eq' | 'neq' | 'starts' | 'ends'
type FilterOp = NumericOp | StringOp
type FilterFieldId = 'title' | 'year' | 'file_path' | 'container' | 'video_codec' | 'bitrate' | 'size' | 'duration'

interface FilterFieldDef {
  id: FilterFieldId
  label: string
  type: 'numeric' | 'string'
  unit?: string
}

const FILTER_FIELDS: FilterFieldDef[] = [
  { id: 'title',       label: 'Title',    type: 'string' },
  { id: 'year',        label: 'Year',     type: 'numeric' },
  { id: 'file_path',   label: 'File Path', type: 'string' },
  { id: 'container',   label: 'Container', type: 'string' },
  { id: 'video_codec', label: 'Codec',    type: 'string' },
  { id: 'bitrate',     label: 'Bitrate',  type: 'numeric', unit: 'kbps' },
  { id: 'size',        label: 'Size',     type: 'numeric', unit: 'MB' },
  { id: 'duration',    label: 'Duration', type: 'numeric', unit: 'min' },
]

const NUMERIC_OPS: { id: NumericOp; label: string }[] = [
  { id: 'gt',  label: '>' },
  { id: 'gte', label: '≥' },
  { id: 'lt',  label: '<' },
  { id: 'lte', label: '≤' },
  { id: 'eq',  label: '=' },
  { id: 'neq', label: '≠' },
]

const STRING_OPS: { id: StringOp; label: string }[] = [
  { id: 'includes', label: 'includes' },
  { id: 'excludes', label: 'excludes' },
  { id: 'eq',       label: '=' },
  { id: 'neq',      label: '≠' },
  { id: 'starts',   label: 'starts with' },
  { id: 'ends',     label: 'ends with' },
]

interface ActiveFilter {
  id: number
  field: FilterFieldId
  op: FilterOp
  value: string
}

function defaultOp(fieldType: 'numeric' | 'string'): FilterOp {
  return fieldType === 'numeric' ? 'gt' : 'includes'
}

function matchesFilter(movie: Movie, filter: ActiveFilter): boolean {
  const fieldDef = FILTER_FIELDS.find((f) => f.id === filter.field)!
  const raw = movie[filter.field as keyof Movie]

  if (fieldDef.type === 'numeric') {
    const filterNum = parseFloat(filter.value)
    if (isNaN(filterNum)) return true // incomplete, skip
    // Convert stored units to user-facing units for comparison
    let movieNum: number | null
    if (filter.field === 'size') {
      movieNum = raw != null ? (raw as number) / 1_048_576 : null
    } else if (filter.field === 'duration') {
      movieNum = raw != null ? (raw as number) / 60_000 : null
    } else {
      movieNum = raw as number | null
    }
    if (movieNum == null) return false
    switch (filter.op as NumericOp) {
      case 'gt':  return movieNum >  filterNum
      case 'gte': return movieNum >= filterNum
      case 'lt':  return movieNum <  filterNum
      case 'lte': return movieNum <= filterNum
      case 'eq':  return movieNum === filterNum
      case 'neq': return movieNum !== filterNum
    }
  } else {
    const movieStr = ((raw as string | null) ?? '').toLowerCase()
    const filterStr = filter.value.toLowerCase()
    switch (filter.op as StringOp) {
      case 'includes': return movieStr.includes(filterStr)
      case 'excludes': return !movieStr.includes(filterStr)
      case 'eq':       return movieStr === filterStr
      case 'neq':      return movieStr !== filterStr
      case 'starts':   return movieStr.startsWith(filterStr)
      case 'ends':     return movieStr.endsWith(filterStr)
    }
  }
  return true
}

// ── Title / path matching ────────────────────────────────────────────────────

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(\d{4}\)/g, '')    // strip (year)
    .replace(/\b\d{4}\b/g, '')    // strip bare 4-digit years
    .replace(/[^a-z0-9\s]/g, ' ') // replace punctuation/dots with space
    .replace(/\s+/g, ' ')
    .trim()
}

function titleMatchesFilename(movie: Movie): boolean {
  if (!movie.file_path || !movie.title) return true
  const parts = movie.file_path.replace(/\\/g, '/').split('/')
  const filename = parts[parts.length - 1] ?? ''
  const nameNoExt = filename.replace(/\.[^.]+$/, '') // strip extension
  const normTitle = normalizeForMatch(movie.title)
  const normFile  = normalizeForMatch(nameNoExt)
  if (!normFile) return false
  return normFile.includes(normTitle) || normTitle.includes(normFile)
}

function titleMatchesPath(movie: Movie): boolean {
  if (!movie.file_path || !movie.title) return true
  const parts = movie.file_path.replace(/\\/g, '/').split('/')
  const folderName = parts.length >= 2 ? parts[parts.length - 2] : ''
  const normTitle  = normalizeForMatch(movie.title)
  const normFolder = normalizeForMatch(folderName)
  if (!normFolder) return false
  return normFolder.includes(normTitle) || normTitle.includes(normFolder)
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FilterRow({
  filter,
  onChange,
  onRemove,
}: {
  filter: ActiveFilter
  onChange: (updated: ActiveFilter) => void
  onRemove: () => void
}) {
  const fieldDef = FILTER_FIELDS.find((f) => f.id === filter.field)!
  const ops = fieldDef.type === 'numeric' ? NUMERIC_OPS : STRING_OPS

  function handleFieldChange(newField: FilterFieldId) {
    const newDef = FILTER_FIELDS.find((f) => f.id === newField)!
    onChange({ ...filter, field: newField, op: defaultOp(newDef.type), value: '' })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={filter.field}
        onChange={(e) => handleFieldChange(e.target.value as FilterFieldId)}
        className="border rounded px-2 py-1 text-sm bg-background"
      >
        {FILTER_FIELDS.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>

      <select
        value={filter.op}
        onChange={(e) => onChange({ ...filter, op: e.target.value as FilterOp })}
        className="border rounded px-2 py-1 text-sm bg-background"
      >
        {ops.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <input
          type={fieldDef.type === 'numeric' ? 'number' : 'text'}
          value={filter.value}
          onChange={(e) => onChange({ ...filter, value: e.target.value })}
          placeholder="value"
          className="border rounded px-2 py-1 text-sm bg-background w-32"
        />
        {fieldDef.unit && (
          <span className="text-xs text-muted-foreground">{fieldDef.unit}</span>
        )}
      </div>

      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive text-sm px-1"
        aria-label="Remove filter"
      >
        ✕
      </button>
    </div>
  )
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

function Paginator({
  page,
  totalPages,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number
  totalPages: number
  pageSize: number
  total: number
  onPage: (p: number) => void
  onPageSize: (n: number) => void
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <p className="text-xs text-muted-foreground">
        {total} movies
        {pageSize > 0 && total > pageSize && (
          <> &mdash; page {page} of {totalPages}</>
        )}
      </p>
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={() => onPage(1)} disabled={page === 1}
          className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-muted/50">«</button>
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-muted/50">‹</button>
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-muted/50">›</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
          className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-muted/50">»</button>
      </div>
      <select
        value={pageSize}
        onChange={(e) => onPageSize(Number(e.target.value))}
        className="border rounded px-2 py-1 text-xs bg-background"
      >
        {[25, 50, 100, 250].map((n) => (
          <option key={n} value={n}>{n} per page</option>
        ))}
        <option value={0}>All</option>
      </select>
    </div>
  )
}

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

// ── Main component ──────────────────────────────────────────────────────────

export default function MoviesTable() {
  const [sections, setSections] = useState<Section[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [multiOnly, setMultiOnly] = useState(false)
  const [unmatchedOnly, setUnmatchedOnly] = useState(false)
  const [filenameMismatch, setFilenameMismatch] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(
    new Set(ALL_COLUMNS.map((c) => c.id))
  )
  const [filters, setFilters] = useState<ActiveFilter[]>([])
  const nextId = useRef(1)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

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

    if (unmatchedOnly) {
      movies = movies.filter((m) => !titleMatchesPath(m))
    }

    if (filenameMismatch) {
      movies = movies.filter((m) => !titleMatchesFilename(m))
    }

    if (filters.length > 0) {
      movies = movies.filter((m) => filters.every((f) => matchesFilter(m, f)))
    }

    return sortMovies(movies, sortKey, sortDir)
  }, [activeSection, multiOnly, unmatchedOnly, filenameMismatch, filters, sortKey, sortDir])

  // Reset to page 1 whenever the filtered/sorted set changes
  const prevMovieCount = useRef(visibleMovies.length)
  if (prevMovieCount.current !== visibleMovies.length) {
    prevMovieCount.current = visibleMovies.length
    if (page !== 1) setPage(1)
  }

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(visibleMovies.length / pageSize))
  const pagedMovies = pageSize === 0 ? visibleMovies : visibleMovies.slice((page - 1) * pageSize, page * pageSize)

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
    <div className="p-8 space-y-4">
      {/* Top controls */}
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
        <ColumnPicker columns={ALL_COLUMNS} visible={visibleCols} onChange={handleColChange} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={multiOnly}
            onChange={(e) => setMultiOnly(e.target.checked)}
          />
          Multiple files only
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unmatchedOnly}
            onChange={(e) => setUnmatchedOnly(e.target.checked)}
          />
          Title mismatches file path
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filenameMismatch}
            onChange={(e) => setFilenameMismatch(e.target.checked)}
          />
          Title mismatches filename
        </label>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {filters.map((f) => (
          <FilterRow
            key={f.id}
            filter={f}
            onChange={(updated) => updateFilter(f.id, updated)}
            onRemove={() => removeFilter(f.id)}
          />
        ))}
        <button
          onClick={addFilter}
          className="border rounded px-3 py-1.5 text-sm bg-background hover:bg-muted/50 text-muted-foreground"
        >
          + Add Filter
        </button>
      </div>

      {/* Table */}
      {activeSection && (
        <div className="space-y-2">
          <Paginator
            page={page} totalPages={totalPages} pageSize={pageSize} total={visibleMovies.length}
            onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }}
          />
          <div className="rounded-md border overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <Th label="Title" col="title" className="w-56" />
                  {col('year') && <Th label="Year" col="year" />}
                  {col('file_path') && <Th label="File Path" col="file_path" />}
                  {col('container') && <Th label="Container" col="container" />}
                  {col('video_codec') && <Th label="Codec" col="video_codec" />}
                  {col('bitrate') && <Th label="Bitrate" col="bitrate" />}
                  {col('size') && <Th label="Size" col="size" />}
                  {col('duration') && <Th label="Duration" col="duration" />}
                  {col('play') && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {pagedMovies.map((movie, i) => (
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
          <Paginator
            page={page} totalPages={totalPages} pageSize={pageSize} total={visibleMovies.length}
            onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }}
          />
        </div>
      )}
    </div>
  )
}
