import type { AllColumnId, ColumnGroup, SortKey } from '@/lib/types'

export interface TableColumnSchema {
  id: AllColumnId
  label: string
  sortKey?: SortKey
}

const MOVIE_TABLE_COLUMNS: TableColumnSchema[] = [
  { id: 'id', label: 'ID', sortKey: 'id' },
  { id: 'title', label: 'Title', sortKey: 'title' },
  { id: 'original_title', label: 'Original Title', sortKey: 'original_title' },
  { id: 'sort_title', label: 'Sort Title', sortKey: 'sort_title' },
  { id: 'year', label: 'Year', sortKey: 'year' },
  { id: 'view_count', label: 'View Count', sortKey: 'view_count' },
  { id: 'originally_available', label: 'Originally Available', sortKey: 'originally_available' },
  { id: 'added_at', label: 'Added At', sortKey: 'added_at' },
  { id: 'updated_at', label: 'Last Updated', sortKey: 'updated_at' },
  { id: 'duration', label: 'Duration', sortKey: 'duration' },
  { id: 'edition', label: 'Edition', sortKey: 'edition' },
  { id: 'content_rating', label: 'Content Rating', sortKey: 'content_rating' },
  { id: 'imdb_rating', label: 'IMDb Rating', sortKey: 'imdb_rating' },
  { id: 'rt_audience_rating', label: 'RT Audience Rating', sortKey: 'rt_audience_rating' },
  { id: 'rt_critics_rating', label: 'RT Critics Rating', sortKey: 'rt_critics_rating' },
  { id: 'tmdb_rating', label: 'TMDb Rating', sortKey: 'tmdb_rating' },
  { id: 'directors', label: 'Directors', sortKey: 'directors' },
  { id: 'producers', label: 'Producers', sortKey: 'producers' },
  { id: 'writers', label: 'Writers', sortKey: 'writers' },
  { id: 'collections', label: 'Collections', sortKey: 'collections' },
  { id: 'country', label: 'Country', sortKey: 'country' },
  { id: 'genres', label: 'Genres', sortKey: 'genres' },
  { id: 'labels', label: 'Labels', sortKey: 'labels' },
  { id: 'studio', label: 'Studio', sortKey: 'studio' },
  { id: 'summary', label: 'Summary' },
  { id: 'tagline', label: 'Tagline', sortKey: 'tagline' },
  { id: 'video_codec', label: 'Video Codec', sortKey: 'video_codec' },
  { id: 'video_bitrate', label: 'Video Bitrate', sortKey: 'video_bitrate' },
  { id: 'frame_rate', label: 'Frame Rate', sortKey: 'frame_rate' },
  { id: 'width', label: 'Width', sortKey: 'width' },
  { id: 'height', label: 'Height', sortKey: 'height' },
  { id: 'aspect_ratio', label: 'Aspect Ratio', sortKey: 'aspect_ratio' },
  { id: 'video_resolution', label: 'Resolution', sortKey: 'video_resolution' },
  { id: 'audio_codec', label: 'Audio Codec', sortKey: 'audio_codec' },
  { id: 'audio_bitrate', label: 'Audio Bitrate', sortKey: 'audio_bitrate' },
  { id: 'audio_channels', label: 'Audio Channels', sortKey: 'audio_channels' },
  { id: 'audio_language', label: 'Audio Language', sortKey: 'audio_language' },
  { id: 'audio_tracks', label: 'Audio Tracks', sortKey: 'audio_tracks' },
  { id: 'subtitles', label: 'Subtitles', sortKey: 'subtitles' },
  { id: 'file_path', label: 'File Path', sortKey: 'file_path' },
  { id: 'container', label: 'Container', sortKey: 'container' },
  { id: 'overall_bitrate', label: 'Overall Bitrate', sortKey: 'overall_bitrate' },
  { id: 'size', label: 'Size', sortKey: 'size' },
  { id: 'background', label: 'Background' },
  { id: 'poster', label: 'Poster' },
]

export const SHOW_TABLE_COLUMNS: TableColumnSchema[] = [
  { id: 'id', label: 'ID', sortKey: 'id' },
  { id: 'title', label: 'Title', sortKey: 'title' },
  { id: 'original_title', label: 'Original Title', sortKey: 'original_title' },
  { id: 'show_title', label: 'Show Title', sortKey: 'show_title' },
  { id: 'year', label: 'Year', sortKey: 'year' },
  { id: 'season_count', label: 'Seasons', sortKey: 'season_count' },
  { id: 'episode_count', label: 'Episodes', sortKey: 'episode_count' },
  { id: 'viewed_episode_count', label: 'Watched', sortKey: 'viewed_episode_count' },
  { id: 'sort_title', label: 'Sort Title', sortKey: 'sort_title' },
  { id: 'originally_available', label: 'Originally Available', sortKey: 'originally_available' },
  { id: 'added_at', label: 'Added At', sortKey: 'added_at' },
  { id: 'updated_at', label: 'Last Updated', sortKey: 'updated_at' },
  { id: 'studio', label: 'Studio', sortKey: 'studio' },
  { id: 'genres', label: 'Genres', sortKey: 'genres' },
  { id: 'summary', label: 'Summary', sortKey: 'summary' },
  { id: 'content_rating', label: 'Content Rating', sortKey: 'content_rating' },
  { id: 'imdb_rating', label: 'IMDb Rating', sortKey: 'imdb_rating' },
  { id: 'rt_audience_rating', label: 'RT Audience Rating', sortKey: 'rt_audience_rating' },
  { id: 'rt_critics_rating', label: 'RT Critics Rating', sortKey: 'rt_critics_rating' },
  { id: 'tmdb_rating', label: 'TMDb Rating', sortKey: 'tmdb_rating' },
  { id: 'tagline', label: 'Tagline', sortKey: 'tagline' },
  { id: 'collections', label: 'Collections', sortKey: 'collections' },
  { id: 'labels', label: 'Labels', sortKey: 'labels' },
  { id: 'country', label: 'Country', sortKey: 'country' },
  { id: 'directors', label: 'Directors', sortKey: 'directors' },
  { id: 'producers', label: 'Producers', sortKey: 'producers' },
  { id: 'writers', label: 'Writers', sortKey: 'writers' },
  { id: 'file_path', label: 'File Path', sortKey: 'file_path' },
  { id: 'container', label: 'Container', sortKey: 'container' },
  { id: 'video_codec', label: 'Video Codec', sortKey: 'video_codec' },
  { id: 'video_resolution', label: 'Resolution', sortKey: 'video_resolution' },
  { id: 'video_bitrate', label: 'Video Bitrate', sortKey: 'video_bitrate' },
  { id: 'width', label: 'Width', sortKey: 'width' },
  { id: 'height', label: 'Height', sortKey: 'height' },
  { id: 'aspect_ratio', label: 'Aspect Ratio', sortKey: 'aspect_ratio' },
  { id: 'frame_rate', label: 'Frame Rate', sortKey: 'frame_rate' },
  { id: 'audio_channels', label: 'Audio Channels', sortKey: 'audio_channels' },
  { id: 'audio_codec', label: 'Audio Codec', sortKey: 'audio_codec' },
  { id: 'audio_bitrate', label: 'Audio Bitrate', sortKey: 'audio_bitrate' },
  { id: 'audio_tracks', label: 'Audio Tracks', sortKey: 'audio_tracks' },
  { id: 'audio_language', label: 'Audio Language', sortKey: 'audio_language' },
  { id: 'subtitles', label: 'Subtitles', sortKey: 'subtitles' },
  { id: 'overall_bitrate', label: 'Overall Bitrate', sortKey: 'overall_bitrate' },
  { id: 'size', label: 'Size', sortKey: 'size' },
  { id: 'duration', label: 'Duration', sortKey: 'duration' },
  { id: 'poster', label: 'Poster' },
  { id: 'background', label: 'Background' },
]

export const SHOW_DEFAULT_VISIBLE_COLUMNS: AllColumnId[] = [
  'title',
  'id',
  'year',
  'season_count',
  'episode_count',
  'viewed_episode_count',
  'studio',
  'genres',
  'summary',
]

export const EPISODE_DEFAULT_VISIBLE_COLUMNS: AllColumnId[] = [
  'id',
  'season_count',
  'episode_count',
  'sort_title',
  'container',
  'video_codec',
  'video_resolution',
  'audio_codec',
  'audio_channels',
  'subtitles',
  'file_path',
  'size',
  'duration',
]

export const SHOW_DEFAULT_COL_ORDER: AllColumnId[] = [
  'id',
  'title',
  'year',
  'season_count',
  'episode_count',
  'viewed_episode_count',
  'original_title',
  'sort_title',
  'originally_available',
  'added_at',
  'updated_at',
  'content_rating',
  'imdb_rating',
  'rt_audience_rating',
  'rt_critics_rating',
  'tmdb_rating',
  'studio',
  'genres',
  'summary',
  'tagline',
  'collections',
  'labels',
  'country',
  'poster',
  'background',
]

export const EPISODE_DEFAULT_COL_ORDER: AllColumnId[] = [
  'id',
  'show_title',
  'title',
  'sort_title',
  'season_count',
  'episode_count',
  'year',
  'originally_available',
  'added_at',
  'updated_at',
  'duration',
  'content_rating',
  'imdb_rating',
  'rt_audience_rating',
  'rt_critics_rating',
  'tmdb_rating',
  'directors',
  'writers',
  'summary',
  'tagline',
  'video_codec',
  'video_bitrate',
  'frame_rate',
  'width',
  'height',
  'aspect_ratio',
  'video_resolution',
  'audio_codec',
  'audio_bitrate',
  'audio_channels',
  'audio_language',
  'audio_tracks',
  'subtitles',
  'file_path',
  'container',
  'overall_bitrate',
  'size',
  'poster',
  'background',
]

export const SHOW_VALID_COLUMN_IDS = new Set(SHOW_TABLE_COLUMNS.map((col) => col.id))
export const MOVIE_HEADER_COLUMN_META = new Map(MOVIE_TABLE_COLUMNS.map((column) => [column.id, column]))
const SHOW_TABLE_COLUMN_MAP = new Map(SHOW_TABLE_COLUMNS.map((column) => [column.id, column]))

export function isAlwaysVisibleShowColumn(viewMode: 'shows' | 'episodes', id: AllColumnId): boolean {
  if (id === 'title') return true
  return viewMode === 'episodes' && id === 'show_title'
}

export function getShowHeaderColumn(viewMode: 'shows' | 'episodes', id: AllColumnId) {
  const column = SHOW_TABLE_COLUMN_MAP.get(id)
  if (!column) return null
  if (viewMode !== 'episodes') return column
  if (id === 'title') return { ...column, label: 'Episode Title' }
  if (id === 'show_title') return { ...column, label: 'Show Title' }
  if (id === 'season_count') return { ...column, label: 'Season' }
  if (id === 'episode_count') return { ...column, label: 'Episode' }
  return column
}

export function buildColumnGroups(groups: Array<{ label: string; columns: AllColumnId[] }>, columns: TableColumnSchema[]): ColumnGroup[] {
  const columnMap = new Map(columns.map((column) => [column.id, column]))
  return groups.map((group) => ({
    label: group.label,
    columns: group.columns.flatMap((id) => {
      const column = columnMap.get(id)
      return column ? [{ id: column.id, label: column.label }] : []
    }),
  }))
}
