import type { ColumnGroup } from '@/lib/types'

export const SHOW_COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: 'General',
    columns: [
      { id: 'id', label: 'ID' },
      { id: 'episode_count', label: 'Episodes' },
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
