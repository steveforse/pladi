export interface Movie {
  id: string
  title: string
  media_type?: string
  original_title: string | null
  show_title?: string | null
  episode_number: string | null
  year: number | null
  file_path: string | null
  added_at?: number | null
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
  view_count?: number | null
  imdb_rating: number | null
  rt_critics_rating: number | null
  rt_audience_rating: number | null
  tmdb_rating: number | null
  genres: string | null
  directors: string | null
  sort_title: string | null
  edition: string | null
  originally_available: string | null
  studio: string | null
  tagline: string | null
  season_count: number | null
  episode_count: number | null
  viewed_episode_count: number | null
  country: string | null
  writers: string | null
  producers: string | null
  collections: string | null
  labels: string | null
  art: string | null
  subtitles: string | null
  audio_tracks: string | null
  audio_language: string | null
  audio_bitrate: number | null
  video_bitrate: number | null
}

export interface PlexServerInfo {
  id: number
  name: string
  url: string
}

export interface Section {
  title: string
  items: Movie[]
}

export type SortKey = keyof Pick<Movie, 'id' | 'title' | 'original_title' | 'show_title' | 'episode_number' | 'year' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'overall_bitrate' | 'size' | 'duration' | 'added_at' | 'updated_at' | 'content_rating' | 'imdb_rating' | 'rt_critics_rating' | 'rt_audience_rating' | 'tmdb_rating' | 'genres' | 'directors' | 'sort_title' | 'edition' | 'originally_available' | 'studio' | 'tagline' | 'season_count' | 'episode_count' | 'viewed_episode_count' | 'country' | 'writers' | 'producers' | 'collections' | 'labels' | 'subtitles' | 'audio_tracks' | 'audio_language' | 'audio_bitrate' | 'video_bitrate'>
export type SortDir = 'asc' | 'desc'

export type ColumnId = 'title' | 'id' | 'original_title' | 'show_title' | 'episode_number' | 'year' | 'content_rating' | 'imdb_rating' | 'rt_critics_rating' | 'rt_audience_rating' | 'tmdb_rating' | 'genres' | 'directors' | 'summary' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'overall_bitrate' | 'size' | 'duration' | 'added_at' | 'updated_at' | 'poster' | 'sort_title' | 'edition' | 'originally_available' | 'studio' | 'tagline' | 'season_count' | 'episode_count' | 'viewed_episode_count' | 'country' | 'writers' | 'producers' | 'collections' | 'labels' | 'background' | 'subtitles' | 'audio_tracks' | 'audio_language' | 'audio_bitrate' | 'video_bitrate'
export type AllColumnId = ColumnId

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
export type FilterFieldId = 'id' | 'title' | 'original_title' | 'show_title' | 'episode_number' | 'year' | 'content_rating' | 'imdb_rating' | 'rt_critics_rating' | 'rt_audience_rating' | 'tmdb_rating' | 'genres' | 'directors' | 'summary' | 'file_path' | 'container' | 'video_codec' | 'video_resolution' | 'width' | 'height' | 'aspect_ratio' | 'frame_rate' | 'audio_codec' | 'audio_channels' | 'overall_bitrate' | 'size' | 'duration' | 'added_at' | 'updated_at' | 'poster' | 'sort_title' | 'edition' | 'originally_available' | 'studio' | 'tagline' | 'season_count' | 'episode_count' | 'viewed_episode_count' | 'country' | 'writers' | 'producers' | 'collections' | 'labels' | 'background' | 'subtitles' | 'audio_tracks' | 'audio_language' | 'audio_bitrate' | 'video_bitrate'

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

export type TagField = 'genres' | 'directors' | 'writers' | 'producers' | 'collections' | 'labels' | 'country'
export type TagPatch = Partial<Record<TagField, string | null>>
export type MediaPatch = Partial<Movie>
