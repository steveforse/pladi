import type { AllColumnId, ColumnDef, ColumnGroup } from '@/lib/types'

export const DEFAULT_COL_ORDER: AllColumnId[] = [
  'id', 'poster', 'title', 'original_title', 'year', 'content_rating', 'audience_rating', 'genres', 'directors', 'summary', 'file_path', 'container', 'video_codec', 'video_resolution', 'width', 'height', 'aspect_ratio', 'frame_rate', 'audio_codec', 'audio_channels', 'bitrate', 'size', 'duration', 'updated_at',
]

export const COLUMN_GROUPS: ColumnGroup[] = [
  { label: 'General', columns: [
    { id: 'id', label: 'ID' },
    { id: 'poster', label: 'Poster' },
    { id: 'original_title', label: 'Original Title' },
    { id: 'year', label: 'Year' },
    { id: 'duration', label: 'Duration' },
    { id: 'updated_at', label: 'Last Updated' },
  ]},
  { label: 'Plex Metadata', columns: [
    { id: 'content_rating', label: 'Rating' },
    { id: 'audience_rating', label: 'Audience Rating' },
    { id: 'genres', label: 'Genres' },
    { id: 'directors', label: 'Directors' },
    { id: 'summary', label: 'Summary' },
  ]},
  { label: 'Video', columns: [
    { id: 'video_codec', label: 'Video Codec' },
    { id: 'video_resolution', label: 'Resolution' },
    { id: 'width', label: 'Width' },
    { id: 'height', label: 'Height' },
    { id: 'aspect_ratio', label: 'Aspect Ratio' },
    { id: 'frame_rate', label: 'Frame Rate' },
  ]},
  { label: 'Audio', columns: [
    { id: 'audio_codec', label: 'Audio Codec' },
    { id: 'audio_channels', label: 'Channels' },
    { id: 'bitrate', label: 'Bitrate' },
  ]},
  { label: 'File', columns: [
    { id: 'file_path', label: 'File Path' },
    { id: 'container', label: 'Container' },
    { id: 'size', label: 'Size' },
  ]},
]

export const ALL_COLUMNS: ColumnDef[] = COLUMN_GROUPS.flatMap((g) => g.columns)
