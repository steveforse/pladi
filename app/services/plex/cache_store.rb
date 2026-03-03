# frozen_string_literal: true

module Plex
  class CacheStore
    CACHE_TTL = 30.days

    def initialize(server_id)
      @server_id = server_id
    end

    def key(*parts)
      "plex/server/#{@server_id}/#{parts.join('/')}"
    end

    # rubocop:disable Style/ArgumentsForwarding, Naming/BlockForwarding
    def fetch(cache_key, **opts, &block)
      Rails.cache.fetch(cache_key, expires_in: CACHE_TTL, **opts, &block)
    end

    def write(cache_key, value, **opts)
      Rails.cache.write(cache_key, value, expires_in: CACHE_TTL, **opts)
    end
    # rubocop:enable Style/ArgumentsForwarding, Naming/BlockForwarding

    def read(cache_key)
      Rails.cache.read(cache_key)
    end

    def read_multi(*keys)
      Rails.cache.read_multi(*keys)
    end

    def enrich_version
      Rails.cache.read(key('enrich_version')) || 0
    end

    def bump_enrich_version
      Rails.cache.write(key('enrich_version'), enrich_version + 1, expires_in: CACHE_TTL)
    end

    def cached_movies_for(section_id, updated_at, &)
      Rails.cache.fetch(
        key('section', section_id, updated_at, enrich_version),
        expires_in: CACHE_TTL,
        &
      )
    end

    def posters_cached(movie_ids)
      keys = movie_ids.index_by { |id| key('poster', id) }
      hits = Rails.cache.read_multi(*keys.keys)
      keys.filter_map { |cache_key, id| id if hits.key?(cache_key) }.to_set
    end

    def backgrounds_cached(movie_ids)
      keys = movie_ids.index_by { |id| key('background', id) }
      hits = Rails.cache.read_multi(*keys.keys)
      keys.filter_map { |cache_key, id| id if hits.key?(cache_key) }.to_set
    end
  end
end
