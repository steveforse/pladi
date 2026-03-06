# frozen_string_literal: true

module Plex
  class Server
    delegate :enrich_sections, to: :enricher
    delegate :update_movie, :update_show, :update_episode, to: :media_updater
    delegate :poster_for, :background_for, to: :image_store

    def initialize(server)
      @http_client   = HttpClient.new(server)
      @cache_store   = CacheStore.new(server.id)
      @library       = LibraryFetcher.new(@http_client, @cache_store)
      @enricher      = Enricher.new(@http_client, @cache_store)
      @image_store   = ImageStore.new(@http_client, @cache_store)
      @media_updater = MediaUpdater.new(@http_client, @cache_store)
    end

    def friendly_name
      @http_client.get('/').dig('MediaContainer', 'friendlyName')
    end

    def sections(scope: MediaScope.movies, refresh: false)
      return refresh_sections(scope) if refresh

      @cache_store.fetch(@cache_store.key('sections', *scope.cache_key_parts)) do
        @library.fetch_sections(scope:)
      end
    end

    def detail_for(media_id, scope: MediaScope.movies)
      media = find_item(media_id, scope:)
      return nil unless media

      return @enricher.enrich_show(media_id) if media[:media_type] == 'show'

      @enricher.enrich_movie(media_id, media[:file_path])
    end

    def enriched_library(scope: MediaScope.movies)
      enriched_sections = @enricher.enrich_sections(
        sections(scope:),
        scope:
      )

      {
        sections: enriched_sections,
        **image_cache_payload(enriched_sections)
      }
    end

    private

    def refresh_sections(scope)
      @library.fetch_sections(scope:).tap do |section_data|
        @cache_store.write(@cache_store.key('sections', *scope.cache_key_parts), section_data)
      end
    end

    def find_item(media_id, scope:)
      sections(scope:).flat_map { |section| section[:movies] }.find do |item|
        item[:id].to_s == media_id.to_s
      end
    end

    def image_cache_payload(sections)
      cached_posters, uncached_posters = @image_store.partition_posters_by_cache(sections)
      cached_backgrounds, uncached_backgrounds = @image_store.partition_backgrounds_by_cache(sections)

      {
        cached_poster_ids: cached_posters.pluck(:id),
        uncached_poster_movies: uncached_posters,
        cached_background_ids: cached_backgrounds.pluck(:id),
        uncached_background_movies: uncached_backgrounds
      }
    end

    attr_reader :enricher, :media_updater, :image_store
  end
end
