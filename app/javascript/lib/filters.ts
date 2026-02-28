import type { ActiveFilter, FilterFieldDef, FilterGroup, FilterOp, NumericOp, StringOp, Movie } from '@/lib/types'

export const FILTER_FIELD_GROUPS: FilterGroup[] = [
  { label: 'General', fields: [
    { id: 'title',          label: 'Title',          type: 'string' },
    { id: 'id',             label: 'ID',             type: 'string' },
    { id: 'original_title', label: 'Original Title', type: 'string' },
    { id: 'year',           label: 'Year',           type: 'numeric' },
    { id: 'duration',       label: 'Duration',       type: 'numeric', unit: 'min' },
    { id: 'updated_at',     label: 'Last Updated',   type: 'date' },
    { id: 'poster',         label: 'Poster',         type: 'string', nullOnly: true },
  ]},
  { label: 'Plex Metadata', fields: [
    { id: 'content_rating',  label: 'Rating',          type: 'string' },
    { id: 'audience_rating', label: 'Audience Rating', type: 'numeric' },
    { id: 'genres',          label: 'Genres',          type: 'string' },
    { id: 'directors',       label: 'Directors',       type: 'string' },
    { id: 'summary',         label: 'Summary',         type: 'string' },
  ]},
  { label: 'Video', fields: [
    { id: 'video_codec',      label: 'Video Codec',  type: 'string' },
    { id: 'video_resolution', label: 'Resolution',   type: 'string' },
    { id: 'width',            label: 'Width',        type: 'numeric', unit: 'px' },
    { id: 'height',           label: 'Height',       type: 'numeric', unit: 'px' },
    { id: 'aspect_ratio',     label: 'Aspect Ratio', type: 'numeric' },
    { id: 'frame_rate',       label: 'Frame Rate',   type: 'string' },
  ]},
  { label: 'Audio', fields: [
    { id: 'audio_codec',    label: 'Audio Codec', type: 'string' },
    { id: 'audio_channels', label: 'Channels',    type: 'numeric' },
    { id: 'bitrate',        label: 'Bitrate',     type: 'numeric', unit: 'kbps' },
  ]},
  { label: 'File', fields: [
    { id: 'file_path',  label: 'File Path',  type: 'string' },
    { id: 'container',  label: 'Container',  type: 'string' },
    { id: 'size',       label: 'Size',       type: 'numeric', unit: 'MB' },
  ]},
]

export const FILTER_FIELDS: FilterFieldDef[] = FILTER_FIELD_GROUPS.flatMap((g) => g.fields)

export const NUMERIC_OPS: { id: NumericOp; label: string }[] = [
  { id: 'gt',  label: '>' },
  { id: 'gte', label: '≥' },
  { id: 'lt',  label: '<' },
  { id: 'lte', label: '≤' },
  { id: 'eq',  label: '=' },
  { id: 'neq', label: '≠' },
]

export const STRING_OPS: { id: StringOp; label: string }[] = [
  { id: 'includes', label: 'includes' },
  { id: 'excludes', label: 'excludes' },
  { id: 'eq',       label: '=' },
  { id: 'neq',      label: '≠' },
  { id: 'starts',   label: 'starts with' },
  { id: 'ends',     label: 'ends with' },
]

export const NULL_OPS: { id: 'present' | 'missing'; label: string }[] = [
  { id: 'present', label: 'is present' },
  { id: 'missing', label: 'is missing' },
]

export function defaultOp(fieldType: 'numeric' | 'string' | 'date'): FilterOp {
  return fieldType === 'string' ? 'includes' : 'gte'
}

export function matchesFilter(movie: Movie, filter: ActiveFilter): boolean {
  const fieldDef = FILTER_FIELDS.find((f) => f.id === filter.field)!

  const raw = filter.field === 'poster' ? movie.thumb : movie[filter.field as keyof Movie]

  if (filter.op === 'missing') return raw == null || raw === ''
  if (filter.op === 'present') return raw != null && raw !== ''

  if (fieldDef.type === 'date') {
    if (!filter.value) return true
    // Date input gives ISO "YYYY-MM-DD". Parse as local midnight so it matches
    // the local date shown by formatDate (which uses toLocaleDateString).
    const filterLocal = new Date(filter.value + 'T00:00:00')
    if (isNaN(filterLocal.getTime())) return true
    const filterDay = filterLocal.getFullYear() * 10000 + (filterLocal.getMonth() + 1) * 100 + filterLocal.getDate()
    const movieTs = raw as number | null
    if (movieTs == null) return false
    const movieLocal = new Date(movieTs * 1000)
    const movieDay = movieLocal.getFullYear() * 10000 + (movieLocal.getMonth() + 1) * 100 + movieLocal.getDate()
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
