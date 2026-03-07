import { buildColumnGroups, SHOW_TABLE_COLUMNS } from '@/lib/mediaColumns'

export const SHOW_COLUMN_GROUPS = buildColumnGroups([
  { label: 'General', columns: ['id', 'episode_count', 'added_at', 'updated_at', 'original_title', 'originally_available', 'season_count', 'sort_title', 'viewed_episode_count', 'year'] },
  { label: 'Details', columns: ['collections', 'country', 'genres', 'labels', 'studio', 'summary', 'tagline'] },
  { label: 'Images', columns: ['background', 'poster'] },
  { label: 'Ratings', columns: ['content_rating', 'imdb_rating', 'rt_audience_rating', 'rt_critics_rating', 'tmdb_rating'] },
], SHOW_TABLE_COLUMNS)

export const EPISODE_COLUMN_GROUPS = buildColumnGroups([
  { label: 'General', columns: ['id', 'duration', 'episode_count', 'added_at', 'updated_at', 'originally_available', 'season_count', 'sort_title', 'year'] },
  { label: 'Audio', columns: ['audio_bitrate', 'audio_channels', 'audio_codec', 'audio_language', 'audio_tracks', 'subtitles'] },
  { label: 'Credits', columns: ['directors', 'writers'] },
  { label: 'Details', columns: ['summary', 'tagline'] },
  { label: 'File', columns: ['container', 'file_path', 'overall_bitrate', 'size'] },
  { label: 'Images', columns: ['background', 'poster'] },
  { label: 'Ratings', columns: ['content_rating', 'imdb_rating', 'rt_audience_rating', 'rt_critics_rating', 'tmdb_rating'] },
  { label: 'Video', columns: ['aspect_ratio', 'frame_rate', 'height', 'video_bitrate', 'video_codec', 'video_resolution', 'width'] },
], SHOW_TABLE_COLUMNS)
