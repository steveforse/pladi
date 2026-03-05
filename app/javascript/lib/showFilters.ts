import type { FilterFieldDef, FilterGroup } from '@/lib/types'

export const SHOW_FILTER_FIELD_GROUPS: FilterGroup[] = [
  {
    label: 'General',
    fields: [
      { id: 'id', label: 'ID', type: 'string' },
      { id: 'title', label: 'Title', type: 'string' },
      { id: 'original_title', label: 'Original Title', type: 'string' },
      { id: 'sort_title', label: 'Sort Title', type: 'string' },
      { id: 'year', label: 'Year', type: 'numeric' },
      { id: 'season_count', label: 'Seasons', type: 'numeric' },
      { id: 'episode_count', label: 'Episodes', type: 'numeric' },
      { id: 'viewed_episode_count', label: 'Watched Episodes', type: 'numeric' },
      { id: 'updated_at', label: 'Last Updated', type: 'date' },
      { id: 'originally_available', label: 'Originally Available', type: 'date' },
    ],
  },
  {
    label: 'Metadata',
    fields: [
      { id: 'studio', label: 'Studio', type: 'string' },
      { id: 'genres', label: 'Genres', type: 'string' },
      { id: 'summary', label: 'Summary', type: 'string' },
      { id: 'content_rating', label: 'Content Rating', type: 'string' },
      { id: 'tagline', label: 'Tagline', type: 'string' },
      { id: 'collections', label: 'Collections', type: 'string' },
      { id: 'labels', label: 'Labels', type: 'string' },
      { id: 'country', label: 'Country', type: 'string' },
    ],
  },
  {
    label: 'Images',
    fields: [
      { id: 'poster', label: 'Poster', type: 'string', nullOnly: true },
      { id: 'background', label: 'Background', type: 'string', nullOnly: true },
    ],
  },
]

export const SHOW_FILTER_FIELDS: FilterFieldDef[] = SHOW_FILTER_FIELD_GROUPS.flatMap((group) => group.fields)
