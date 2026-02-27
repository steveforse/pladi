export interface Movie {
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
  thumb: string | null
  plex_url: string | null
  summary: string | null
  content_rating: string | null
  audience_rating: number | null
  genres: string | null
  directors: string | null
}

export interface PlexServerInfo {
  id: number
  name: string
  url: string
}

export interface Section {
  title: string
  movies: Movie[]
}

export type SortKey = keyof Pick<Movie, 'id' | 'title' | 'original_title' | 'year' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'bitrate' | 'size' | 'duration' | 'updated_at' | 'content_rating' | 'audience_rating' | 'genres' | 'directors'>
export type SortDir = 'asc' | 'desc'

export type ColumnId = 'id' | 'original_title' | 'year' | 'content_rating' | 'audience_rating' | 'genres' | 'directors' | 'summary' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'bitrate' | 'size' | 'duration' | 'updated_at' | 'poster'
export type AllColumnId = 'title' | ColumnId

export interface ColumnDef {
  id: ColumnId
  label: string
}

export interface ColumnGroup {
  label: string
  columns: ColumnDef[]
}

export type NumericOp = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
export type StringOp = 'includes' | 'excludes' | 'eq' | 'neq' | 'starts' | 'ends'
export type NullOp = 'present' | 'missing'
export type FilterOp = NumericOp | StringOp | NullOp
export type FilterFieldId = 'id' | 'title' | 'original_title' | 'year' | 'content_rating' | 'audience_rating' | 'genres' | 'directors' | 'summary' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'bitrate' | 'size' | 'duration' | 'updated_at' | 'poster'

export interface FilterFieldDef {
  id: FilterFieldId
  label: string
  type: 'numeric' | 'string' | 'date'
  unit?: string
}

export interface FilterGroup {
  label: string
  fields: FilterFieldDef[]
}

export interface ActiveFilter {
  id: number
  field: FilterFieldId
  op: FilterOp
  value: string
}
