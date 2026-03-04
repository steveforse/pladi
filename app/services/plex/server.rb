# frozen_string_literal: true

module Plex
  class Server
    delegate :enrich_sections, to: :enricher
    delegate :update_movie, to: :movie_updater
    delegate :poster_for, :background_for, to: :image_store

    def initialize(server)
      @http_client   = HttpClient.new(server)
      @cache_store   = CacheStore.new(server.id)
      @library       = LibraryFetcher.new(@http_client, @cache_store)
      @enricher      = Enricher.new(@http_client, @cache_store)
      @image_store   = ImageStore.new(@http_client, @cache_store)
      @movie_updater = MovieUpdater.new(@http_client, @cache_store)
    end

    def friendly_name
      @http_client.get('/').dig('MediaContainer', 'friendlyName')
    end

    def sections(refresh: false)
      return refresh_sections if refresh

      @cache_store.fetch(@cache_store.key('sections')) { @library.fetch_sections }
    end

    def detail_for(movie_id)
      movie = find_movie(movie_id)
      return nil unless movie

      @enricher.enrich_movie(movie_id, movie[:file_path])
    end

    def enriched_library
      enriched_sections = @enricher.enrich_sections(sections)
      cached_posters, uncached_posters = @image_store.partition_posters_by_cache(enriched_sections)
      cached_backgrounds, uncached_backgrounds = @image_store.partition_backgrounds_by_cache(enriched_sections)

      {
        sections: enriched_sections,
        cached_poster_ids: cached_posters.pluck(:id),
        uncached_poster_movies: uncached_posters,
        cached_background_ids: cached_backgrounds.pluck(:id),
        uncached_background_movies: uncached_backgrounds
      }
    end

    private

    def refresh_sections
      @library.fetch_sections.tap do |section_data|
        @cache_store.write(@cache_store.key('sections'), section_data)
      end
    end

    def find_movie(movie_id)
      sections.flat_map { |section| section[:movies] }.find { |movie| movie[:id].to_s == movie_id.to_s }
    end

    attr_reader :enricher, :movie_updater, :image_store
  end
end
