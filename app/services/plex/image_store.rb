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
      all_movies    = sections.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
      poster_movies = all_movies.filter_map { |m| { id: m[:id], thumb: m[:thumb] } if m[:thumb] }
      cached_ids    = @cache.posters_cached(poster_movies.pluck(:id))
      poster_movies.partition { |m| cached_ids.include?(m[:id]) }
    end

    def partition_backgrounds_by_cache(sections)
      all_movies        = sections.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
      background_movies = all_movies.filter_map { |m| { id: m[:id], art: m[:art] } if m[:art] }
      cached_ids        = @cache.backgrounds_cached(background_movies.pluck(:id))
      background_movies.partition { |m| cached_ids.include?(m[:id]) }
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
