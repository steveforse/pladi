# frozen_string_literal: true

module Plex
  class ImageStore
    def initialize(http_client, cache_store)
      @http  = http_client
      @cache = cache_store
    end

    def poster_for(media_id)
      fetch_image(:poster, media_id)
    end

    def background_for(media_id)
      fetch_image(:background, media_id)
    end

    def partition_posters_by_cache(sections)
      partition_by_cache(sections, image_field: :thumb, cache_lookup: :cached_poster_media_ids)
    end

    def partition_backgrounds_by_cache(sections)
      partition_by_cache(sections, image_field: :art, cache_lookup: :cached_background_media_ids)
    end

    private

    def fetch_image(image_type, media_id)
      @cache.fetch(@cache.key(image_type.to_s, media_id), skip_nil: true) do
        @http.get_image("/library/metadata/#{media_id}/#{image_path(image_type)}")
      end
    rescue StandardError
      nil
    end

    def partition_by_cache(sections, image_field:, cache_lookup:)
      items = deduplicated_items(sections)
      image_items = items.filter_map { |item| { id: item[:id], image_field => item[image_field] } if item[image_field] }
      cached_ids = @cache.public_send(cache_lookup, image_items.pluck(:id))
      image_items.partition { |item| cached_ids.include?(item[:id]) }
    end

    def deduplicated_items(sections)
      sections.flat_map { |section| section[:items] }.uniq { |item| item[:id] }
    end

    def image_path(image_type)
      image_type == :poster ? 'thumb' : 'art'
    end
  end
end
