# frozen_string_literal: true

class PlexService
  CACHE_TTL = Plex::CacheStore::CACHE_TTL

  SCALAR_FIELD_MAP = Plex::FieldMaps::SCALAR_FIELD_MAP
  TAG_FIELD_MAP    = Plex::FieldMaps::TAG_FIELD_MAP

  def initialize(server)
    @http     = Plex::HttpClient.new(server)
    @cache    = Plex::CacheStore.new(server.id)
    @library  = Plex::LibraryFetcher.new(@http, @cache)
    @enricher = Plex::Enricher.new(@http, @cache)
    @images   = Plex::ImageStore.new(@http, @cache)
    @updater  = Plex::MovieUpdater.new(@http, @cache)
  end

  def friendly_name
    @http.get('/').dig('MediaContainer', 'friendlyName')
  end

  def cached_sections
    @cache.fetch(@cache.key('sections')) { sections }
  end

  def refresh_sections
    sections.tap { |data| @cache.write(@cache.key('sections'), data) }
  end

  def sections
    @library.fetch_sections
  end

  delegate :enrich_sections, to: :@enricher
  delegate :poster_for, :warm_poster, :background_for, :warm_background,
           :poster_cache_partition, :background_cache_partition, to: :@images
  delegate :update_movie, to: :@updater

  def detail_for(movie_id)
    movie = cached_sections.flat_map { |s| s[:movies] }.find { |m| m[:id].to_s == movie_id.to_s }
    return nil unless movie

    @enricher.enrich_movie(movie_id, movie[:file_path])
  end
end
