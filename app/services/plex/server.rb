# frozen_string_literal: true

module Plex
  class Server
    delegate :enrich_sections, to: :enricher
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

    def detail_for(media_id, scope: MediaScope.movies, file_path: nil)
      item = find_item(media_id, scope:, file_path:) || direct_item_reference(media_id, scope:, file_path:)
      return nil unless item

      @enricher.enrich_detail(media_id, media_type: item[:media_type], file_path: item[:file_path])
    end

    def enriched_library(scope: MediaScope.movies)
      enriched_sections = @enricher.enrich_sections(
        sections(scope:),
        scope:
      )

      payload = { sections: enriched_sections }
      payload.merge!(image_cache_payload(enriched_sections)) if scope.include_image_cache?
      payload
    end

    def update_media(media_id, fields, scope: MediaScope.movies, file_path: nil)
      @media_updater.update(media_id, fields, media_type: scope.update_media_type, file_path: file_path)
    end

    private

    def refresh_sections(scope)
      @library.fetch_sections(scope:).tap do |section_data|
        @cache_store.write(@cache_store.key('sections', *scope.cache_key_parts), section_data)
      end
    end

    def find_item(media_id, scope:, file_path: nil)
      sections(scope:).flat_map { |section| section[:items] }.find do |item|
        item[:id].to_s == media_id.to_s && (file_path.blank? || item[:file_path].to_s == file_path.to_s)
      end
    end

    def direct_item_reference(media_id, scope:, file_path: nil)
      metadata = enricher.metadata_for(media_id)
      return nil if metadata.blank?
      return nil unless scope.accepts_media_type?(metadata['type'].to_s)

      build_direct_item_reference(metadata, file_path:)
    end

    def image_cache_payload(sections)
      cached_posters, uncached_posters = @image_store.partition_posters_by_cache(sections)
      cached_backgrounds, uncached_backgrounds = @image_store.partition_backgrounds_by_cache(sections)

      {
        cached_poster_media_ids: cached_posters.pluck(:id),
        uncached_poster_items: uncached_posters,
        cached_background_media_ids: cached_backgrounds.pluck(:id),
        uncached_background_items: uncached_backgrounds
      }
    end

    attr_reader :enricher, :media_updater, :image_store

    def build_direct_item_reference(metadata, file_path:)
      media_type = metadata['type'].to_s
      resolved_file_path = MediaPartPathResolver.resolve(metadata, requested_file_path: file_path)
      return nil if row_file_path_required?(media_type) && resolved_file_path.blank?

      {
        id: metadata['ratingKey'].to_s,
        media_type: media_type,
        file_path: resolved_file_path
      }
    end

    def row_file_path_required?(media_type)
      media_type != 'show'
    end
  end
end
