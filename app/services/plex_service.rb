# frozen_string_literal: true

class PlexService
  ENRICH_THREADS = ENV.fetch('PLEX_ENRICH_THREADS', '3').to_i

  def initialize(server)
    @http      = PlexHttp.new(server.url, server.token)
    @server_id = server.id
  end

  def friendly_name
    @http.get('/').dig('MediaContainer', 'friendlyName')
  end

  def cached_sections
    Rails.cache.fetch(sections_cache_key, expires_in: 24.hours) { sections }
  end

  def refresh_sections
    sections.tap { |data| Rails.cache.write(sections_cache_key, data, expires_in: 24.hours) }
  end

  def sections
    fetch_movie_sections.map do |section|
      key        = section['key']
      updated_at = section['updatedAt']
      movies = Rails.cache.fetch(section_cache_key(key, updated_at), expires_in: 7.days) do
        PlexSection.new(@http, machine_identifier)
          .movies_for(key)
          .sort_by { |m| m[:title].downcase }
      end
      { title: section['title'], movies: movies }
    end
  end

  def enrich_sections(sections)
    all_movies = sections.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
    details    = fetch_details_concurrently(all_movies)
    sections.map do |section|
      { title: section[:title], movies: section[:movies].map { |m| m.merge(details[m[:id]] || {}) } }
    end
  end

  def poster_for(movie_id)
    Rails.cache.fetch(poster_cache_key(movie_id), expires_in: 30.days) do
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
    Rails.cache.fetch(poster_cache_key(movie_id), expires_in: 30.days) { @http.fetch_poster_bytes(thumb_path) }
  rescue StandardError
    nil
  end

  private

  # Thread-pool enrichment — mutex/queue coordination resists further extraction.
  # rubocop:disable Metrics/MethodLength, Metrics/AbcSize
  def fetch_details_concurrently(movies)
    queue  = movies.dup
    mutex  = Mutex.new
    result = {}

    Array.new(ENRICH_THREADS) do
      Thread.new do
        loop do
          movie = mutex.synchronize { queue.shift }
          break unless movie

          detail = Rails.cache.fetch(movie_detail_cache_key(movie), expires_in: 30.days) do
            fetch_movie_detail(movie[:id])
          end
          mutex.synchronize { result[movie[:id]] = detail }
        end
      end
    end.each(&:join)

    result
  end
  # rubocop:enable Metrics/MethodLength, Metrics/AbcSize

  def machine_identifier
    @machine_identifier ||= @http.get('/identity').dig('MediaContainer', 'machineIdentifier')
  end

  def sections_cache_key = "plex/server/#{@server_id}/sections"
  def section_cache_key(key, updated_at) = "plex/server/#{@server_id}/section/#{key}/#{updated_at}"
  def poster_cache_key(movie_id) = "plex/server/#{@server_id}/poster/#{movie_id}"
  def movie_detail_cache_key(movie) = "plex/server/#{@server_id}/movie/detail/#{movie[:id]}/#{movie[:updated_at]}"

  def fetch_movie_sections
    data = @http.get('/library/sections')
    (data.dig('MediaContainer', 'Directory') || []).select { |d| d['type'] == 'movie' }
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
