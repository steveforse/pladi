import type { FilterFieldDef, FilterGroup } from '@/lib/types'

export const SHOW_FILTER_FIELD_GROUPS: FilterGroup[] = [
  {
    label: 'General',
    fields: [
      { id: 'id', label: 'ID', type: 'string' },
      { id: 'episode_count', label: 'Episodes', type: 'numeric' },
      { id: 'updated_at', label: 'Last Updated', type: 'date' },
      { id: 'original_title', label: 'Original Title', type: 'string' },
      { id: 'originally_available', label: 'Originally Available', type: 'date' },
      { id: 'season_count', label: 'Seasons', type: 'numeric' },
      { id: 'sort_title', label: 'Sort Title', type: 'string' },
      { id: 'title', label: 'Title', type: 'string' },
      { id: 'viewed_episode_count', label: 'Watched Episodes', type: 'numeric' },
      { id: 'year', label: 'Year', type: 'numeric' },
    ],
  },
  {
    label: 'Details',
    fields: [
      { id: 'collections', label: 'Collections', type: 'string' },
      { id: 'country', label: 'Country', type: 'string' },
      { id: 'genres', label: 'Genres', type: 'string' },
      { id: 'labels', label: 'Labels', type: 'string' },
      { id: 'studio', label: 'Studio', type: 'string' },
      { id: 'summary', label: 'Summary', type: 'string' },
      { id: 'tagline', label: 'Tagline', type: 'string' },
    ],
  },
  {
    label: 'Images',
    fields: [
      { id: 'background', label: 'Background', type: 'string', nullOnly: true },
      { id: 'poster', label: 'Poster', type: 'string', nullOnly: true },
    ],
  },
  {
    label: 'Ratings',
    fields: [
      { id: 'content_rating', label: 'Content Rating', type: 'string' },
      { id: 'imdb_rating', label: 'IMDb Rating', type: 'numeric' },
      { id: 'rt_audience_rating', label: 'RT Audience Rating', type: 'numeric' },
      { id: 'rt_critics_rating', label: 'RT Critics Rating', type: 'numeric' },
      { id: 'tmdb_rating', label: 'TMDb Rating', type: 'numeric' },
    ],
  },
]

export const EPISODE_FILTER_FIELD_GROUPS: FilterGroup[] = [
  {
    label: 'General',
    fields: [
      { id: 'id', label: 'ID', type: 'string' },
      { id: 'duration', label: 'Duration', type: 'numeric', unit: 'min' },
      { id: 'episode_count', label: 'Episode', type: 'numeric' },
      { id: 'title', label: 'Episode Title', type: 'string' },
      { id: 'updated_at', label: 'Last Updated', type: 'date' },
      { id: 'originally_available', label: 'Originally Available', type: 'date' },
      { id: 'season_count', label: 'Season', type: 'numeric' },
      { id: 'show_title', label: 'Show Title', type: 'string' },
      { id: 'sort_title', label: 'Sort Title', type: 'string' },
      { id: 'year', label: 'Year', type: 'numeric' },
    ],
  },
  {
    label: 'Audio',
    fields: [
      { id: 'audio_bitrate', label: 'Audio Bitrate', type: 'numeric', unit: 'kbps' },
      { id: 'audio_channels', label: 'Audio Channels', type: 'numeric' },
      { id: 'audio_codec', label: 'Audio Codec', type: 'string' },
      { id: 'audio_language', label: 'Audio Language', type: 'string' },
      { id: 'audio_tracks', label: 'Audio Tracks', type: 'string' },
      { id: 'subtitles', label: 'Subtitles', type: 'string' },
    ],
  },
  {
    label: 'Credits',
    fields: [
      { id: 'directors', label: 'Directors', type: 'string' },
      { id: 'writers', label: 'Writers', type: 'string' },
    ],
  },
  {
    label: 'Details',
    fields: [
      { id: 'summary', label: 'Summary', type: 'string' },
      { id: 'tagline', label: 'Tagline', type: 'string' },
    ],
  },
  {
    label: 'File',
    fields: [
      { id: 'container', label: 'Container', type: 'string' },
      { id: 'file_path', label: 'File Path', type: 'string' },
      { id: 'overall_bitrate', label: 'Overall Bitrate', type: 'numeric', unit: 'Mbps' },
      { id: 'size', label: 'Size', type: 'numeric', unit: 'MB' },
    ],
  },
  {
    label: 'Images',
    fields: [
      { id: 'background', label: 'Background', type: 'string', nullOnly: true },
      { id: 'poster', label: 'Poster', type: 'string', nullOnly: true },
    ],
  },
  {
    label: 'Ratings',
    fields: [
      { id: 'content_rating', label: 'Content Rating', type: 'string' },
      { id: 'imdb_rating', label: 'IMDb Rating', type: 'numeric' },
      { id: 'rt_audience_rating', label: 'RT Audience Rating', type: 'numeric' },
      { id: 'rt_critics_rating', label: 'RT Critics Rating', type: 'numeric' },
      { id: 'tmdb_rating', label: 'TMDb Rating', type: 'numeric' },
    ],
  },
  {
    label: 'Video',
    fields: [
      { id: 'aspect_ratio', label: 'Aspect Ratio', type: 'numeric' },
      { id: 'frame_rate', label: 'Frame Rate', type: 'string' },
      { id: 'height', label: 'Height', type: 'numeric', unit: 'px' },
      { id: 'video_resolution', label: 'Resolution', type: 'string' },
      { id: 'video_bitrate', label: 'Video Bitrate', type: 'numeric', unit: 'kbps' },
      { id: 'video_codec', label: 'Video Codec', type: 'string' },
      { id: 'width', label: 'Width', type: 'numeric', unit: 'px' },
    ],
  },
]

export const SHOW_FILTER_FIELDS: FilterFieldDef[] = SHOW_FILTER_FIELD_GROUPS.flatMap((group) => group.fields)
export const EPISODE_FILTER_FIELDS: FilterFieldDef[] = EPISODE_FILTER_FIELD_GROUPS.flatMap((group) => group.fields)
