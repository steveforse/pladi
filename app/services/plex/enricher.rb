# frozen_string_literal: true

module Plex
  class Enricher
    STREAM_DETAIL_KEYS = %i[
      subtitles_by_file
      audio_by_file
      audio_language_by_file
      audio_bitrate_by_file
      video_bitrate_by_file
    ].freeze

    ENRICH_THREADS = ENV.fetch('PLEX_ENRICH_THREADS', '3').to_i

    def initialize(http_client, cache_store)
      @cache = cache_store
      @detail_fetcher = MovieDetailFetcher.new(http_client)
      @concurrent_detail_fetcher = ConcurrentDetailFetcher.new(
        cache_store: cache_store,
        detail_fetcher: @detail_fetcher,
        thread_count: ENRICH_THREADS
      )
    end

    def enrich_sections(sections)
      sections.map { |section| enrich_section(section) }
    end

    def enrich_movie(movie_id, file_path)
      detail = fetch_movie_detail(movie_id)
      merge_detail({}, detail, file_path: file_path)
    end

    def fetch_movie_detail(movie_id)
      @detail_fetcher.fetch(movie_id)
    end

    private

    def enrich_section(section)
      key = @cache.key('section', section[:id], section[:updated_at], 'enriched', @cache.enrich_version)
      @cache.fetch(key) do
        movies = section[:movies]
        details = @concurrent_detail_fetcher.fetch(movies)

        section.merge(
          movies: movies.map do |m|
            merge_detail(m, details[m[:id]] || {}, file_path: m[:file_path])
          end
        )
      end
    end

    def merge_detail(movie, detail, file_path:)
      movie
        .merge(detail.except(*STREAM_DETAIL_KEYS))
        .merge(file_stream_detail(detail, file_path))
    end

    def file_stream_detail(detail, file_path)
      {
        subtitles: detail[:subtitles_by_file]&.dig(file_path),
        audio_tracks: detail[:audio_by_file]&.dig(file_path),
        audio_language: detail[:audio_language_by_file]&.dig(file_path),
        audio_bitrate: detail[:audio_bitrate_by_file]&.dig(file_path),
        video_bitrate: detail[:video_bitrate_by_file]&.dig(file_path)
      }
    end
  end
end
