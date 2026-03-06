import { z } from 'zod'

export const MeResponseSchema = z.object({
  email_address: z.string().optional(),
  download_images: z.boolean().optional(),
})

export const SetupResponseSchema = z.object({
  needed: z.boolean().optional(),
})

export const PlexServerInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
})

export const PlexServerInfoListSchema = z.array(PlexServerInfoSchema)

export const LookupNameResponseSchema = z.object({
  name: z.string().optional(),
})

export const MovieListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  media_type: z.string().optional(),
  original_title: z.string().nullable(),
  show_title: z.string().nullable().optional(),
  episode_number: z.string().nullable().optional(),
  year: z.number().nullable(),
  file_path: z.string().nullable(),
  container: z.string().nullable(),
  video_codec: z.string().nullable(),
  video_resolution: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  aspect_ratio: z.number().nullable(),
  frame_rate: z.string().nullable(),
  audio_codec: z.string().nullable(),
  audio_channels: z.number().nullable(),
  overall_bitrate: z.number().nullable(),
  size: z.number().nullable(),
  duration: z.number().nullable(),
  updated_at: z.number().nullable(),
  thumb: z.string().nullable(),
  plex_url: z.string().nullable(),
  summary: z.string().nullable().optional(),
  content_rating: z.string().nullable().optional(),
  imdb_rating: z.number().nullable().optional(),
  rt_critics_rating: z.number().nullable().optional(),
  rt_audience_rating: z.number().nullable().optional(),
  tmdb_rating: z.number().nullable().optional(),
  genres: z.string().nullable().optional(),
  directors: z.string().nullable().optional(),
  sort_title: z.string().nullable(),
  edition: z.string().nullable().optional(),
  originally_available: z.string().nullable(),
  studio: z.string().nullable(),
  tagline: z.string().nullable(),
  season_count: z.number().nullable().optional(),
  episode_count: z.number().nullable().optional(),
  viewed_episode_count: z.number().nullable().optional(),
  country: z.string().nullable().optional(),
  writers: z.string().nullable().optional(),
  producers: z.string().nullable().optional(),
  collections: z.string().nullable().optional(),
  labels: z.string().nullable().optional(),
  art: z.string().nullable(),
  subtitles: z.string().nullable().optional(),
  audio_tracks: z.string().nullable().optional(),
  audio_language: z.string().nullable().optional(),
  audio_bitrate: z.number().nullable().optional(),
  video_bitrate: z.number().nullable().optional(),
}).strict()

export const MovieDetailSchema = z.object({
  summary: z.string().nullable(),
  content_rating: z.string().nullable(),
  edition: z.string().nullable(),
  imdb_rating: z.number().nullable(),
  rt_critics_rating: z.number().nullable(),
  rt_audience_rating: z.number().nullable(),
  tmdb_rating: z.number().nullable(),
  genres: z.string().nullable(),
  directors: z.string().nullable(),
  country: z.string().nullable(),
  writers: z.string().nullable(),
  producers: z.string().nullable(),
  collections: z.string().nullable(),
  labels: z.string().nullable(),
  subtitles: z.string().nullable(),
  audio_tracks: z.string().nullable(),
  audio_language: z.string().nullable(),
  audio_bitrate: z.number().nullable(),
  video_bitrate: z.number().nullable(),
}).strict()

export const SectionSchema = z.object({
  title: z.string(),
  items: z.array(MovieListItemSchema),
})

export const SectionListSchema = z.array(SectionSchema)

export const PosterMovieSchema = z.object({
  id: z.string(),
  thumb: z.string(),
})

export const BackgroundMovieSchema = z.object({
  id: z.string(),
  art: z.string(),
})

export const EnrichResponseSchema = z.object({
  sections: SectionListSchema,
  cached_poster_media_ids: z.array(z.string()).optional(),
  uncached_poster_items: z.array(PosterMovieSchema).optional(),
  cached_background_media_ids: z.array(z.string()).optional(),
  uncached_background_items: z.array(BackgroundMovieSchema).optional(),
})

export const AuditLogSchema = z.object({
  id: z.number(),
  field_name: z.string(),
  field_type: z.union([z.literal('scalar'), z.literal('tag')]),
  old_value: z.string().nullable(),
  new_value: z.string().nullable(),
  created_at: z.string(),
  media_type: z.string(),
  media_id: z.string(),
  media_title: z.string(),
  file_path: z.string().nullable().optional(),
  section_title: z.string(),
  plex_server: z.object({
    id: z.number(),
    name: z.string(),
  }),
})

export const AuditLogListSchema = z.array(AuditLogSchema)
