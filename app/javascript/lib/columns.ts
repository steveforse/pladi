import type { ColumnDef } from '@/lib/types'
import { buildColumnGroups, MOVIE_HEADER_COLUMN_META } from '@/lib/mediaColumns'

export const DEFAULT_COL_ORDER = Array.from(MOVIE_HEADER_COLUMN_META.keys())

export const COLUMN_GROUPS = buildColumnGroups([
  { label: 'General', columns: ['id', 'duration', 'edition', 'added_at', 'updated_at', 'originally_available', 'original_title', 'sort_title', 'year'] },
  { label: 'Audio', columns: ['audio_bitrate', 'audio_channels', 'audio_codec', 'audio_language', 'audio_tracks', 'subtitles'] },
  { label: 'Credits', columns: ['directors', 'producers', 'writers'] },
  { label: 'Details', columns: ['collections', 'country', 'genres', 'labels', 'studio', 'summary', 'tagline'] },
  { label: 'File', columns: ['container', 'file_path', 'overall_bitrate', 'size'] },
  { label: 'Images', columns: ['background', 'poster'] },
  { label: 'Ratings', columns: ['content_rating', 'imdb_rating', 'rt_audience_rating', 'rt_critics_rating', 'tmdb_rating'] },
  { label: 'Video', columns: ['aspect_ratio', 'frame_rate', 'width', 'height', 'video_resolution', 'video_bitrate', 'video_codec'] },
], Array.from(MOVIE_HEADER_COLUMN_META.values()))

export const ALL_COLUMNS: ColumnDef[] = COLUMN_GROUPS.flatMap((group) => group.columns)
