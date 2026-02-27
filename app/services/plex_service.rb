# frozen_string_literal: true

class PlexService
  ENRICH_THREADS = ENV.fetch('PLEX_ENRICH_THREADS', '3').to_i
  CACHE_TTL = 30.days

  def initialize(server)
    @server    = server
    @http      = PlexHttp.new(server.url, server.token)
    @server_id = server.id
  end

  def friendly_name
    @http.get('/').dig('MediaContainer', 'friendlyName')
  end

  def cached_sections
    Rails.cache.fetch(sections_cache_key, expires_in: CACHE_TTL) { sections }
  end

  def refresh_sections
    sections.tap { |data| Rails.cache.write(sections_cache_key, data, expires_in: CACHE_TTL) }
  end

  def sections
    fetch_movie_sections.map do |section|
      section_id = section['key']
      updated_at = section['updatedAt']
      movies = Rails.cache.fetch(section_cache_key(section_id, updated_at), expires_in: CACHE_TTL) do
        PlexSection.new(@server)
          .movies_for(section_id)
          .sort_by { |m| m[:title].downcase }
      end
      { id: section_id, updated_at: updated_at, title: section['title'], movies: movies }
    end
  end

  def enrich_sections(sections)
    sections.map do |section|
      Rails.cache.fetch(enriched_section_cache_key(section[:id], section[:updated_at]), expires_in: CACHE_TTL) do
        movies   = section[:movies]
        details  = fetch_details_concurrently(movies)
        section.merge(movies: movies.map { |m| m.merge(details[m[:id]] || {}) })
      end
    end
  end

  def poster_for(movie_id)
    Rails.cache.fetch(poster_cache_key(movie_id), expires_in: CACHE_TTL) do
      thumb_path = @http.get("/library/metadata/#{movie_id}").dig('MediaContainer', 'Metadata', 0, 'thumb')
      next nil unless thumb_path

      @http.fetch_poster_bytes(thumb_path)
    end
  rescue StandardError
    nil
  end

  def poster_cached?(movie_id)
    Rails.cache.exist?(poster_cache_key(movie_id))
  end

  def warm_poster(movie_id, thumb_path)
    Rails.cache.fetch(poster_cache_key(movie_id), expires_in: CACHE_TTL) { @http.fetch_poster_bytes(thumb_path) }
  rescue StandardError
    nil
  end

  private

  # Thread-pool enrichment — mutex/queue coordination resists further extraction.
  # rubocop:disable Metrics/MethodLength
  def fetch_details_concurrently(movies)
    queue  = movies.dup
    mutex  = Mutex.new
    result = {}

    Array.new(ENRICH_THREADS) do
      Thread.new do
        loop do
          movie = mutex.synchronize { queue.shift }
          break unless movie

          detail = Rails.cache.fetch(movie_detail_cache_key(movie), expires_in: CACHE_TTL) do
            fetch_movie_detail(movie[:id])
          end
          mutex.synchronize { result[movie[:id]] = detail }
        end
      end
    end.each(&:join)

    result
  end
  # rubocop:enable Metrics/MethodLength

  def sections_cache_key = "plex/server/#{@server_id}/sections"
  def section_cache_key(section_id, updated_at) = "plex/server/#{@server_id}/section/#{section_id}/#{updated_at}"
  def enriched_section_cache_key(section_id, updated_at) = "plex/server/#{@server_id}/section/#{section_id}/#{updated_at}/enriched"
  def poster_cache_key(movie_id) = "plex/server/#{@server_id}/poster/#{movie_id}"
  def movie_detail_cache_key(movie) = "plex/server/#{@server_id}/movie/detail/#{movie[:id]}/#{movie[:updated_at]}"

  # An array of hashes representing the JSON payload for each movie section (but
  # not the movies themselves, which are fetched separately section).
  def fetch_movie_sections
    sections_payload = @http.get('/library/sections')
    sections_payload = sections_payload.dig('MediaContainer', 'Directory') || []
    sections_payload.select { |d| d['type'] == 'movie' }
  end

  def fetch_movie_detail(movie_id)
    item = @http.get("/library/metadata/#{movie_id}").dig('MediaContainer', 'Metadata', 0) || {}
    {
      summary: item['summary'],
      content_rating: item['contentRating'],
      audience_rating: item['audienceRating'],
      genres: (item['Genre'] || []).pluck('tag').join(', '),
      directors: (item['Director'] || []).pluck('tag').join(', ')
    }
  rescue StandardError
    {}
  end
end
