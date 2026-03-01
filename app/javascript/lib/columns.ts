import type { AllColumnId, ColumnDef, ColumnGroup } from '@/lib/types'

export const DEFAULT_COL_ORDER: AllColumnId[] = [
  'title', 'id',
  'duration', 'edition', 'updated_at', 'originally_available', 'original_title', 'poster', 'sort_title', 'year',
  'audience_rating', 'content_rating', 'critic_rating',
  'directors', 'producers', 'writers',
  'background', 'collections', 'country', 'genres', 'labels', 'studio', 'summary', 'tagline',
  'aspect_ratio', 'frame_rate', 'height', 'video_resolution', 'video_codec', 'width',
  'audio_channels', 'audio_codec', 'audio_language', 'audio_tracks', 'subtitles',
  'container', 'file_path', 'overall_bitrate', 'size',
]

export const COLUMN_GROUPS: ColumnGroup[] = [
  { label: 'General', columns: [
    { id: 'id', label: 'ID' },
    { id: 'duration', label: 'Duration' },
    { id: 'edition', label: 'Edition' },
    { id: 'updated_at', label: 'Last Updated' },
    { id: 'originally_available', label: 'Originally Available' },
    { id: 'original_title', label: 'Original Title' },
    { id: 'poster', label: 'Poster' },
    { id: 'sort_title', label: 'Sort Title' },
    { id: 'year', label: 'Year' },
  ]},
  { label: 'Ratings', columns: [
    { id: 'audience_rating', label: 'Audience Rating' },
    { id: 'content_rating', label: 'Content Rating' },
    { id: 'critic_rating', label: 'Critic Rating' },
  ]},
  { label: 'Credits', columns: [
    { id: 'directors', label: 'Directors' },
    { id: 'producers', label: 'Producers' },
    { id: 'writers', label: 'Writers' },
  ]},
  { label: 'Details', columns: [
    { id: 'background', label: 'Background' },
    { id: 'collections', label: 'Collections' },
    { id: 'country', label: 'Country' },
    { id: 'genres', label: 'Genres' },
    { id: 'labels', label: 'Labels' },
    { id: 'studio', label: 'Studio' },
    { id: 'summary', label: 'Summary' },
    { id: 'tagline', label: 'Tagline' },
  ]},
  { label: 'Video', columns: [
    { id: 'aspect_ratio', label: 'Aspect Ratio' },
    { id: 'frame_rate', label: 'Frame Rate' },
    { id: 'height', label: 'Height' },
    { id: 'video_resolution', label: 'Resolution' },
    { id: 'video_codec', label: 'Video Codec' },
    { id: 'width', label: 'Width' },
  ]},
  { label: 'Audio', columns: [
    { id: 'audio_channels', label: 'Audio Channels' },
    { id: 'audio_codec', label: 'Audio Codec' },
    { id: 'audio_language', label: 'Audio Language' },
    { id: 'audio_tracks', label: 'Audio Tracks' },
    { id: 'subtitles', label: 'Subtitles' },
  ]},
  { label: 'File', columns: [
    { id: 'container', label: 'Container' },
    { id: 'file_path', label: 'File Path' },
    { id: 'overall_bitrate', label: 'Overall Bitrate' },
    { id: 'size', label: 'Size' },
  ]},
]

export const ALL_COLUMNS: ColumnDef[] = COLUMN_GROUPS.flatMap((g) => g.columns)
