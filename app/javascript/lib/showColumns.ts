import type { ColumnGroup } from '@/lib/types'

export const SHOW_COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: 'General',
    columns: [
      { id: 'episode_count', label: 'Episodes' },
      { id: 'id', label: 'ID' },
      { id: 'updated_at', label: 'Last Updated' },
      { id: 'original_title', label: 'Original Title' },
      { id: 'originally_available', label: 'Originally Available' },
      { id: 'season_count', label: 'Seasons' },
      { id: 'sort_title', label: 'Sort Title' },
      { id: 'viewed_episode_count', label: 'Watched' },
      { id: 'year', label: 'Year' },
    ],
  },
  {
    label: 'Details',
    columns: [
      { id: 'collections', label: 'Collections' },
      { id: 'content_rating', label: 'Content Rating' },
      { id: 'country', label: 'Country' },
      { id: 'genres', label: 'Genres' },
      { id: 'labels', label: 'Labels' },
      { id: 'studio', label: 'Studio' },
      { id: 'summary', label: 'Summary' },
      { id: 'tagline', label: 'Tagline' },
    ],
  },
  {
    label: 'Images',
    columns: [
      { id: 'background', label: 'Background' },
      { id: 'poster', label: 'Poster' },
    ],
  },
]

export const EPISODE_COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: 'General',
    columns: [
      { id: 'duration', label: 'Duration' },
      { id: 'episode_count', label: 'Episode' },
      { id: 'id', label: 'ID' },
      { id: 'updated_at', label: 'Last Updated' },
      { id: 'season_count', label: 'Season' },
      { id: 'year', label: 'Year' },
    ],
  },
  {
    label: 'Video',
    columns: [
      { id: 'aspect_ratio', label: 'Aspect Ratio' },
      { id: 'frame_rate', label: 'Frame Rate' },
      { id: 'height', label: 'Height' },
      { id: 'video_bitrate', label: 'Video Bitrate' },
      { id: 'video_codec', label: 'Video Codec' },
      { id: 'video_resolution', label: 'Resolution' },
      { id: 'width', label: 'Width' },
    ],
  },
  {
    label: 'Audio',
    columns: [
      { id: 'audio_bitrate', label: 'Audio Bitrate' },
      { id: 'audio_channels', label: 'Audio Channels' },
      { id: 'audio_codec', label: 'Audio Codec' },
      { id: 'audio_language', label: 'Audio Language' },
      { id: 'audio_tracks', label: 'Audio Tracks' },
      { id: 'subtitles', label: 'Subtitles' },
    ],
  },
  {
    label: 'File',
    columns: [
      { id: 'container', label: 'Container' },
      { id: 'file_path', label: 'File Path' },
      { id: 'overall_bitrate', label: 'Overall Bitrate' },
      { id: 'size', label: 'Size' },
    ],
  },
  {
    label: 'Images',
    columns: [
      { id: 'background', label: 'Background' },
      { id: 'poster', label: 'Poster' },
    ],
  },
]
