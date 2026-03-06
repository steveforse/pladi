# frozen_string_literal: true

module Plex
  class Enricher
    DETAIL_PARSERS = {
      'movie' => MovieDetailParser,
      'episode' => EpisodeDetailParser,
      'show' => ShowDetailParser
    }.freeze

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
      @metadata_fetcher = MediaMetadataFetcher.new(http_client)
      @detail_fetchers = build_detail_fetchers(http_client)
      @concurrent_fetchers = build_concurrent_fetchers(cache_store)
    end

    def enrich_sections(sections, scope: MediaScope.movies)
      sections.map { |section| enrich_section(section, scope:) }
    end

    def metadata_for(media_id)
      @metadata_fetcher.fetch(media_id)
    end

    def enrich_detail(media_id, media_type:, file_path: nil)
      detail = fetch_detail(media_id, media_type:)
      return detail if media_type == 'show'

      merge_detail({}, detail, file_path: file_path)
    end

    private

    def enrich_section(section, scope:)
      key = enrich_section_key(section, scope:)
      @cache.fetch(key) do
        items = section[:items]
        details = concurrent_fetcher_for(items).fetch(items)

        section.merge(
          items: items.map do |item|
            merge_detail(item, details[item[:id]] || {}, file_path: item[:file_path])
          end
        )
      end
    end

    def build_detail_fetchers(http_client)
      DETAIL_PARSERS.to_h do |media_type, parser_class|
        [media_type, MediaDetailFetcher.new(http_client, parser: parser_class.new)]
      end
    end

    def build_concurrent_fetchers(cache_store)
      @detail_fetchers.transform_values do |detail_fetcher|
        build_concurrent_fetcher(cache_store, detail_fetcher)
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

    def concurrent_fetcher_for(items)
      @concurrent_fetchers.fetch(section_media_type(items))
    end

    def section_media_type(items)
      media_types = items.pluck(:media_type).compact.uniq
      return media_types.first if media_types.one?

      'movie'
    end

    def fetch_detail(media_id, media_type:)
      @detail_fetchers.fetch(media_type).fetch(media_id)
    end

    def merge_detail(item, detail, file_path:)
      item
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
