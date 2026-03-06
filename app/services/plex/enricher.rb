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
      @movie_detail_fetcher = MovieDetailFetcher.new(http_client)
      @show_detail_fetcher = ShowDetailFetcher.new(http_client)
      @concurrent_movie_detail_fetcher = build_concurrent_fetcher(cache_store, @movie_detail_fetcher)
      @concurrent_show_detail_fetcher = build_concurrent_fetcher(cache_store, @show_detail_fetcher)
    end

    def enrich_sections(sections, scope: MediaScope.movies)
      sections.map { |section| enrich_section(section, scope:) }
    end

    def enrich_movie(movie_id, file_path)
      detail = fetch_movie_detail(movie_id)
      merge_detail({}, detail, file_path: file_path)
    end

    def enrich_show(show_id)
      fetch_show_detail(show_id)
    end

    def fetch_movie_detail(movie_id)
      @movie_detail_fetcher.fetch(movie_id)
    end

    def fetch_show_detail(show_id)
      @show_detail_fetcher.fetch(show_id)
    end

    private

    def enrich_section(section, scope:)
      key = enrich_section_key(section, scope:)
      @cache.fetch(key) do
        movies = section[:movies]
        details = concurrent_fetcher_for(movies).fetch(movies)

        section.merge(
          movies: movies.map do |m|
            merge_detail(m, details[m[:id]] || {}, file_path: m[:file_path])
          end
        )
      end
    end

    def build_concurrent_fetcher(cache_store, detail_fetcher)
      ConcurrentDetailFetcher.new(
        cache_store: cache_store,
        detail_fetcher: detail_fetcher,
        thread_count: ENRICH_THREADS
      )
    end

    def enrich_section_key(section, scope:)
      @cache.key(
        'section',
        *scope.cache_key_parts,
        section[:id],
        section[:updated_at],
        'enriched',
        @cache.enrich_version
      )
    end

    def concurrent_fetcher_for(movies)
      return @concurrent_show_detail_fetcher if movies.all? { |movie| movie[:media_type] == 'show' }

      @concurrent_movie_detail_fetcher
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
      }.compact
    end
  end
end
