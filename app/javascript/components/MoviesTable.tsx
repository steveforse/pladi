import React, { useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, Loader2 } from 'lucide-react'
import pladiLogo from '@/assets/pladi_logo.png'

interface Movie {
  id: string
  title: string
  original_title: string | null
  year: number | null
  file_path: string | null
  container: string | null
  video_codec: string | null
  video_resolution: string | null
  width: number | null
  height: number | null
  aspect_ratio: number | null
  frame_rate: string | null
  audio_codec: string | null
  audio_channels: number | null
  bitrate: number | null
  size: number | null
  duration: number | null
  updated_at: number | null
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

function formatDate(ts: number | null): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatFrameRate(fr: string | null): string {
  if (fr == null) return '—'
  switch (fr) {
    case 'NTSC':      return '29.97 fps (NTSC)'
    case 'NTSC Film': return '23.976 fps (NTSC Film)'
    case 'PAL':       return '25 fps (PAL)'
    case '24p':       return '24 fps'
    case '25p':       return '25 fps'
    case '30p':       return '30 fps'
    case '48p':       return '48 fps'
    case '60p':       return '60 fps'
    case '120p':      return '120 fps'
    default:          return fr
  }
}

function formatChannels(ch: number | null): string {
  if (ch == null) return '—'
  switch (ch) {
    case 1: return '1.0 Mono'
    case 2: return '2.0 Stereo'
    case 6: return '5.1'
    case 8: return '7.1'
    default: return String(ch)
  }
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

type SortKey = keyof Pick<Movie, 'id' | 'title' | 'original_title' | 'year' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'bitrate' | 'size' | 'duration' | 'updated_at'>
type SortDir = 'asc' | 'desc'

type ColumnId = 'id' | 'original_title' | 'year' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'bitrate' | 'size' | 'duration' | 'updated_at' | 'play'
type AllColumnId = 'title' | ColumnId

const DEFAULT_COL_ORDER: AllColumnId[] = [
  'id', 'title', 'original_title', 'year', 'file_path', 'container', 'video_codec', 'video_resolution', 'width', 'height', 'aspect_ratio', 'frame_rate', 'audio_codec', 'audio_channels', 'bitrate', 'size', 'duration', 'updated_at', 'play',
]

interface ColumnDef {
  id: ColumnId
  label: string
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: 'id', label: 'ID' },
  { id: 'original_title', label: 'Original Title' },
  { id: 'year', label: 'Year' },
  { id: 'file_path', label: 'File Path' },
  { id: 'container', label: 'Container' },
  { id: 'video_codec', label: 'Video Codec' },
  { id: 'video_resolution', label: 'Resolution' },
  { id: 'width', label: 'Width' },
  { id: 'height', label: 'Height' },
  { id: 'aspect_ratio', label: 'Aspect Ratio' },
  { id: 'frame_rate', label: 'Frame Rate' },
  { id: 'audio_codec', label: 'Audio Codec' },
  { id: 'audio_channels', label: 'Channels' },
  { id: 'bitrate', label: 'Bitrate' },
  { id: 'size', label: 'Size' },
  { id: 'duration', label: 'Duration' },
  { id: 'updated_at', label: 'Last Updated' },
  { id: 'play', label: 'Play' },
]

// ── Filter types ────────────────────────────────────────────────────────────

type NumericOp = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
type StringOp = 'includes' | 'excludes' | 'eq' | 'neq' | 'starts' | 'ends'
type FilterOp = NumericOp | StringOp
type FilterFieldId = 'id' | 'title' | 'original_title' | 'year' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'bitrate' | 'size' | 'duration' | 'updated_at'

interface FilterFieldDef {
  id: FilterFieldId
  label: string
  type: 'numeric' | 'string' | 'date'
  unit?: string
}

const FILTER_FIELDS: FilterFieldDef[] = [
  { id: 'id',             label: 'ID',             type: 'string' },
  { id: 'title',          label: 'Title',          type: 'string' },
  { id: 'original_title', label: 'Original Title', type: 'string' },
  { id: 'year',           label: 'Year',           type: 'numeric' },
  { id: 'file_path',   label: 'File Path', type: 'string' },
  { id: 'container',   label: 'Container', type: 'string' },
  { id: 'video_codec',       label: 'Video Codec',  type: 'string' },
  { id: 'video_resolution',  label: 'Resolution',   type: 'string' },
  { id: 'width',             label: 'Width',        type: 'numeric', unit: 'px' },
  { id: 'height',            label: 'Height',       type: 'numeric', unit: 'px' },
  { id: 'aspect_ratio',      label: 'Aspect Ratio', type: 'numeric' },
  { id: 'frame_rate',        label: 'Frame Rate',   type: 'string' },
  { id: 'audio_codec',       label: 'Audio Codec',  type: 'string' },
  { id: 'audio_channels', label: 'Channels',     type: 'numeric' },
  { id: 'bitrate',        label: 'Bitrate',      type: 'numeric', unit: 'kbps' },
  { id: 'size',        label: 'Size',     type: 'numeric', unit: 'MB' },
  { id: 'duration',    label: 'Duration', type: 'numeric', unit: 'min' },
  { id: 'updated_at',  label: 'Last Updated',  type: 'date' },
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

function defaultOp(fieldType: 'numeric' | 'string' | 'date'): FilterOp {
  return fieldType === 'string' ? 'includes' : 'gte'
}

function matchesFilter(movie: Movie, filter: ActiveFilter): boolean {
  const fieldDef = FILTER_FIELDS.find((f) => f.id === filter.field)!

  const raw = movie[filter.field as keyof Movie]

  if (fieldDef.type === 'date') {
    if (!filter.value) return true
    const filterDay = Math.floor(Date.parse(filter.value) / 86_400_000)
    if (isNaN(filterDay)) return true
    const movieTs = raw as number | null
    if (movieTs == null) return false
    const movieDay = Math.floor(movieTs / 86_400)
    switch (filter.op as NumericOp) {
      case 'gt':  return movieDay >  filterDay
      case 'gte': return movieDay >= filterDay
      case 'lt':  return movieDay <  filterDay
      case 'lte': return movieDay <= filterDay
      case 'eq':  return movieDay === filterDay
      case 'neq': return movieDay !== filterDay
    }
  } else if (fieldDef.type === 'numeric') {
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
  const ops = fieldDef.type === 'string' ? STRING_OPS : NUMERIC_OPS

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
          type={fieldDef.type === 'numeric' ? 'number' : fieldDef.type === 'date' ? 'date' : 'text'}
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
        className="btn px-2 py-0.5 text-sm text-muted-foreground hover:text-destructive"
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
        className="btn px-3 py-1.5 text-sm gap-1.5"
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
          className="btn px-2 py-1 text-xs">«</button>
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="btn px-2 py-1 text-xs">‹</button>
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="btn px-2 py-1 text-xs">›</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
          className="btn px-2 py-1 text-xs">»</button>
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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [multiOnly, setMultiOnly] = useState(false)
  const [unmatchedOnly, setUnmatchedOnly] = useState(false)
  const [filenameMismatch, setFilenameMismatch] = useState(false)
  const [originalTitleMismatch, setOriginalTitleMismatch] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(
    new Set(ALL_COLUMNS.map((c) => c.id).filter((id) => !['original_title', 'width', 'height', 'aspect_ratio', 'frame_rate', 'updated_at'].includes(id)))
  )
  const [filters, setFilters] = useState<ActiveFilter[]>([])
  const nextId = useRef(1)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [colOrder, setColOrder] = useState<AllColumnId[]>(DEFAULT_COL_ORDER)
  const dragColRef = useRef<AllColumnId | null>(null)
  const [dragOverCol, setDragOverCol] = useState<AllColumnId | null>(null)

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
        setRefreshing(true)
        fetch('/api/movies/refresh')
          .then((res) => {
            if (!res.ok) throw new Error()
            return res.json()
          })
          .then((fresh: Section[]) => {
            setSections(fresh)
            setSelectedTitle((prev) =>
              prev === null || fresh.some((s) => s.title === prev)
                ? prev
                : (fresh[0]?.title ?? null)
            )
            setRefreshing(false)
          })
          .catch(() => setRefreshing(false))
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const activeMovies = selectedTitle === null
    ? sections.flatMap((s) => s.movies)
    : (sections.find((s) => s.title === selectedTitle)?.movies ?? [])

  const visibleMovies = useMemo(() => {
    let movies = activeMovies

    if (multiOnly) {
      const counts = new Map<string, number>()
      for (const m of movies) counts.set(m.id, (counts.get(m.id) ?? 0) + 1)
      movies = movies.filter((m) => (counts.get(m.id) ?? 0) > 1)
    }

    if (unmatchedOnly) {
      movies = movies.filter((m) => !titleMatchesPath(m))
    }

    if (filenameMismatch) {
      movies = movies.filter((m) => !titleMatchesFilename(m))
    }

    if (originalTitleMismatch) {
      movies = movies.filter((m) => m.original_title != null && m.original_title !== m.title)
    }

    if (filters.length > 0) {
      movies = movies.filter((m) => filters.every((f) => matchesFilter(m, f)))
    }

    return sortMovies(movies, sortKey, sortDir)
  }, [activeMovies, multiOnly, unmatchedOnly, filenameMismatch, originalTitleMismatch, filters, sortKey, sortDir])

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

  function handleColDragStart(id: AllColumnId) {
    dragColRef.current = id
  }

  function handleColDragOver(e: React.DragEvent, id: AllColumnId) {
    e.preventDefault()
    setDragOverCol(id)
  }

  function handleColDrop(targetId: AllColumnId) {
    const src = dragColRef.current
    if (!src || src === targetId) { setDragOverCol(null); return }
    setColOrder((prev) => {
      const next = [...prev]
      const from = next.indexOf(src)
      const to   = next.indexOf(targetId)
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

  function DragHandle({ colId }: { colId: AllColumnId }) {
    return (
      <span
        draggable
        onDragStart={() => handleColDragStart(colId)}
        onDragEnd={handleColDragEnd}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground shrink-0"
      >
        <GripVertical size={14} />
      </span>
    )
  }

  function Th({ label, col: c, colId, className }: { label: string; col: SortKey; colId: AllColumnId; className?: string }) {
    const isOver = dragOverCol === colId
    return (
      <th
        className={`px-4 py-3 text-left font-medium whitespace-nowrap ${isOver ? 'bg-primary/10' : 'hover:bg-muted/70'} ${className ?? ''}`}
        onDragOver={(e) => handleColDragOver(e, colId)}
        onDrop={() => handleColDrop(colId)}
      >
        <div className="flex items-center gap-1">
          <DragHandle colId={colId} />
          <span className="cursor-pointer select-none" onClick={() => handleSort(c)}>
            {label}<SortIcon active={sortKey === c} dir={sortDir} />
          </span>
        </div>
      </th>
    )
  }

  function ThPlain({ label, colId }: { label?: string; colId: AllColumnId }) {
    const isOver = dragOverCol === colId
    return (
      <th
        className={`px-4 py-3 text-left font-medium whitespace-nowrap ${isOver ? 'bg-primary/10' : ''}`}
        onDragOver={(e) => handleColDragOver(e, colId)}
        onDrop={() => handleColDrop(colId)}
      >
        <div className="flex items-center gap-1">
          <DragHandle colId={colId} />
          {label && <span>{label}</span>}
        </div>
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
        <div className="flex items-center gap-3">
          <img src={pladiLogo} alt="Pladi logo" className="h-12 w-auto" />
          <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
        </div>
        {refreshing && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Updating...
          </span>
        )}
      </div>

      {/* Library selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Select Library:</label>
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

      {/* Advanced Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-sm font-semibold text-muted-foreground">Filters:</h2>
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={originalTitleMismatch}
              onChange={(e) => setOriginalTitleMismatch(e.target.checked)}
            />
            Title mismatches Original Title
          </label>
        </div>
        {filters.map((f) => (
          <FilterRow
            key={f.id}
            filter={f}
            onChange={(updated) => updateFilter(f.id, updated)}
            onRemove={() => removeFilter(f.id)}
          />
        ))}
        <div className="flex items-center gap-2">
          <button
            onClick={addFilter}
            className="btn px-3 py-1.5 text-sm"
          >
            + Add Filter
          </button>
          <div className="ml-auto">
            <ColumnPicker columns={ALL_COLUMNS} visible={visibleCols} onChange={handleColChange} />
          </div>
        </div>
      </div>

      {/* Table */}
      {sections.length > 0 && (
        <div className="space-y-2">
          <Paginator
            page={page} totalPages={totalPages} pageSize={pageSize} total={visibleMovies.length}
            onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }}
          />
          <div className="rounded-md border overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {colOrder.filter((id) => id === 'title' || col(id as ColumnId)).map((id) => {
                    switch (id) {
                      case 'id':             return <Th key={id} label="ID"             col="id"             colId={id} />
                      case 'title':          return <Th key={id} label="Title"          col="title"          colId={id} className="w-56" />
                      case 'original_title': return <Th key={id} label="Original Title" col="original_title" colId={id} />
                      case 'year':           return <Th key={id} label="Year"           col="year"           colId={id} />
                      case 'file_path':      return <Th key={id} label="File Path"      col="file_path"      colId={id} />
                      case 'container':      return <Th key={id} label="Container"      col="container"      colId={id} />
                      case 'video_codec':       return <Th key={id} label="Video Codec"   col="video_codec"       colId={id} />
                      case 'video_resolution':  return <Th key={id} label="Resolution"    col="video_resolution"  colId={id} />
                      case 'width':             return <Th key={id} label="Width"         col="width"             colId={id} />
                      case 'height':            return <Th key={id} label="Height"        col="height"            colId={id} />
                      case 'aspect_ratio':      return <Th key={id} label="Aspect Ratio"  col="aspect_ratio"      colId={id} />
                      case 'frame_rate':        return <Th key={id} label="Frame Rate"    col="frame_rate"        colId={id} />
                      case 'audio_codec':       return <Th key={id} label="Audio Codec"   col="audio_codec"       colId={id} />
                      case 'audio_channels': return <Th key={id} label="Channels"     col="audio_channels" colId={id} />
                      case 'bitrate':        return <Th key={id} label="Bitrate"      col="bitrate"        colId={id} />
                      case 'size':           return <Th key={id} label="Size"           col="size"           colId={id} />
                      case 'duration':       return <Th key={id} label="Duration"  col="duration"    colId={id} />
                      case 'updated_at':     return <Th key={id} label="Last Updated"  col="updated_at"  colId={id} />
                      case 'play':           return <ThPlain key={id} colId={id} />
                    }
                  })}
                </tr>
              </thead>
              <tbody>
                {pagedMovies.map((movie) => (
                  <tr key={movie.id} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
                    {colOrder.filter((id) => id === 'title' || col(id as ColumnId)).map((id) => {
                      switch (id) {
                        case 'id':             return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">{movie.id}</td>
                        case 'title':          return <td key={id} className="px-4 py-2 font-medium whitespace-nowrap">{movie.title}</td>
                        case 'original_title': return <td key={id} className="px-4 py-2 text-muted-foreground whitespace-nowrap">{movie.original_title ?? '—'}</td>
                        case 'year':           return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.year ?? '—'}</td>
                        case 'file_path':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs break-all">{movie.file_path ?? <span className="italic">—</span>}</td>
                        case 'container':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{movie.container ?? '—'}</td>
                        case 'video_codec':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{movie.video_codec ?? '—'}</td>
                        case 'video_resolution': return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.video_resolution ?? '—'}</td>
                        case 'width':            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.width != null ? `${movie.width}px` : '—'}</td>
                        case 'height':           return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.height != null ? `${movie.height}px` : '—'}</td>
                        case 'aspect_ratio':     return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.aspect_ratio ?? '—'}</td>
                        case 'frame_rate':       return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatFrameRate(movie.frame_rate)}</td>
                        case 'audio_codec':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{movie.audio_codec ?? '—'}</td>
                        case 'audio_channels': return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatChannels(movie.audio_channels)}</td>
                        case 'bitrate':        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(movie.bitrate)}</td>
                        case 'size':           return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatSize(movie.size)}</td>
                        case 'duration':       return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatDuration(movie.duration)}</td>
                        case 'updated_at':     return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatDate(movie.updated_at)}</td>
                        case 'play':           return <td key={id} className="px-4 py-2 whitespace-nowrap">{movie.plex_url && <a href={movie.plex_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Play</a>}</td>
                      }
                    })}
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
