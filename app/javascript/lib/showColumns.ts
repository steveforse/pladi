import type { ColumnGroup } from '@/lib/types'

export const SHOW_COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: 'General',
    columns: [
      { id: 'year', label: 'Year' },
      { id: 'season_count', label: 'Seasons' },
      { id: 'episode_count', label: 'Episodes' },
      { id: 'viewed_episode_count', label: 'Watched' },
    ],
  },
  {
    label: 'Details',
    columns: [
      { id: 'studio', label: 'Studio' },
      { id: 'genres', label: 'Genres' },
      { id: 'summary', label: 'Summary' },
    ],
  },
]
