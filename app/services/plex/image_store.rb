# frozen_string_literal: true

module Plex
  class ImageStore
    def initialize(http_client, cache_store)
      @http  = http_client
      @cache = cache_store
    end

    def poster_for(movie_id)
      @cache.fetch(@cache.key('poster', movie_id), skip_nil: true) do
        fetch_poster(movie_id)
      end
    rescue StandardError
      nil
    end

    def background_for(movie_id)
      @cache.fetch(@cache.key('background', movie_id), skip_nil: true) do
        fetch_background(movie_id)
      end
    rescue StandardError
      nil
    end

    def partition_posters_by_cache(sections)
      all_items = sections.flat_map { |section| section[:items] }.uniq { |item| item[:id] }
      poster_items = all_items.filter_map { |item| { id: item[:id], thumb: item[:thumb] } if item[:thumb] }
      cached_ids = @cache.posters_cached(poster_items.pluck(:id))
      poster_items.partition { |item| cached_ids.include?(item[:id]) }
    end

    def partition_backgrounds_by_cache(sections)
      all_items = sections.flat_map { |section| section[:items] }.uniq { |item| item[:id] }
      background_items = all_items.filter_map { |item| { id: item[:id], art: item[:art] } if item[:art] }
      cached_ids = @cache.backgrounds_cached(background_items.pluck(:id))
      background_items.partition { |item| cached_ids.include?(item[:id]) }
    end

    private

    def fetch_poster(movie_id)
      @http.get_image("/library/metadata/#{movie_id}/thumb")
    end

    def fetch_background(movie_id)
      @http.get_image("/library/metadata/#{movie_id}/art")
    end
  end
end
