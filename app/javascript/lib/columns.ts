import type { AllColumnId, ColumnDef, ColumnGroup } from '@/lib/types'

export const DEFAULT_COL_ORDER: AllColumnId[] = [
  'id', 'poster', 'title', 'sort_title', 'original_title', 'year', 'edition', 'originally_available', 'content_rating', 'critic_rating', 'audience_rating', 'genres', 'directors', 'studio', 'tagline', 'country', 'writers', 'producers', 'collections', 'labels', 'summary', 'background', 'file_path', 'container', 'video_codec', 'video_resolution', 'width', 'height', 'aspect_ratio', 'frame_rate', 'audio_codec', 'audio_channels', 'subtitles', 'overall_bitrate', 'size', 'duration', 'updated_at',
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
    { id: 'audio_codec', label: 'Audio Codec' },
    { id: 'audio_channels', label: 'Channels' },
    { id: 'subtitles', label: 'Subtitles' },
  ]},
  { label: 'File', columns: [
    { id: 'overall_bitrate', label: 'Overall Bitrate' },
    { id: 'container', label: 'Container' },
    { id: 'file_path', label: 'File Path' },
    { id: 'size', label: 'Size' },
  ]},
]

export const ALL_COLUMNS: ColumnDef[] = COLUMN_GROUPS.flatMap((g) => g.columns)
