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
  overall_bitrate: number | null
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
  sort_title: string | null
  edition: string | null
  originally_available: string | null
  critic_rating: number | null
  studio: string | null
  tagline: string | null
  country: string | null
  writers: string | null
  producers: string | null
  collections: string | null
  labels: string | null
  art: string | null
  subtitles: string | null
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

export type SortKey = keyof Pick<Movie, 'id' | 'title' | 'original_title' | 'year' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'overall_bitrate' | 'size' | 'duration' | 'updated_at' | 'content_rating' | 'audience_rating' | 'genres' | 'directors' | 'sort_title' | 'edition' | 'originally_available' | 'critic_rating' | 'studio' | 'tagline' | 'country' | 'writers' | 'producers' | 'collections' | 'labels' | 'subtitles'>
export type SortDir = 'asc' | 'desc'

export type ColumnId = 'id' | 'original_title' | 'year' | 'content_rating' | 'audience_rating' | 'genres' | 'directors' | 'summary' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'overall_bitrate' | 'size' | 'duration' | 'updated_at' | 'poster' | 'sort_title' | 'edition' | 'originally_available' | 'critic_rating' | 'studio' | 'tagline' | 'country' | 'writers' | 'producers' | 'collections' | 'labels' | 'background' | 'subtitles'
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
export type FilterFieldId = 'id' | 'title' | 'original_title' | 'year' | 'content_rating' | 'audience_rating' | 'genres' | 'directors' | 'summary' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'overall_bitrate' | 'size' | 'duration' | 'updated_at' | 'poster' | 'sort_title' | 'edition' | 'originally_available' | 'critic_rating' | 'studio' | 'tagline' | 'country' | 'writers' | 'producers' | 'collections' | 'labels' | 'background' | 'subtitles'

export interface FilterFieldDef {
  id: FilterFieldId
  label: string
  type: 'numeric' | 'string' | 'date'
  unit?: string
  nullOnly?: boolean
  /** For string fields where the displayed value differs from the raw value. */
  displayValue?: (raw: string) => string
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
