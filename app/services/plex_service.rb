# frozen_string_literal: true

class PlexService
  ENRICH_THREADS = ENV.fetch('PLEX_ENRICH_THREADS', '3').to_i
  OPEN_TIMEOUT   = 5   # seconds to establish TCP connection
  READ_TIMEOUT   = 30  # seconds to wait for response data

  def initialize(server)
    @base_url  = server.url
    @token     = server.token
    @server_id = server.id
  end

  def friendly_name
    get('/').dig('MediaContainer', 'friendlyName')
  end

  def cached_sections
    Rails.cache.fetch(sections_cache_key, expires_in: 24.hours) { sections }
  end

  def refresh_sections
    sections.tap { |data| Rails.cache.write(sections_cache_key, data, expires_in: 24.hours) }
  end

  def sections
    mid = machine_identifier
    fetch_movie_sections.map do |section|
      key   = section['key']
      mtime = section['updatedAt']
      movies = Rails.cache.fetch(section_cache_key(key, mtime), expires_in: 7.days) do
        fetch_section_movies(key, mid).sort_by { |m| m[:title].downcase }
      end
      { title: section['title'], movies: movies }
    end
  end

  def enrich_sections(sections)
    all_movies = sections.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
    queue      = all_movies.dup
    mutex      = Mutex.new
    details    = {}

    Array.new(ENRICH_THREADS) do
      Thread.new do
        loop do
          movie = mutex.synchronize { queue.shift }
          break unless movie

          detail = Rails.cache.fetch(movie_detail_cache_key(movie), expires_in: 30.days) do
            fetch_movie_detail(movie[:id])
          end
          mutex.synchronize { details[movie[:id]] = detail }
        end
      end
    end.each(&:join)

    sections.map do |section|
      { title: section[:title], movies: section[:movies].map { |m| m.merge(details[m[:id]] || {}) } }
    end
  end

  def poster_for(rating_key)
    Rails.cache.fetch(poster_cache_key(rating_key), expires_in: 30.days) do
      thumb_path = get("/library/metadata/#{rating_key}").dig('MediaContainer', 'Metadata', 0, 'thumb')
      next nil unless thumb_path

      fetch_poster_bytes(thumb_path)
    end
  rescue StandardError
    nil
  end

  def poster_cached?(rating_key)
    Rails.cache.exist?(poster_cache_key(rating_key))
  end

  def warm_poster(rating_key, thumb_path)
    Rails.cache.fetch(poster_cache_key(rating_key), expires_in: 30.days) { fetch_poster_bytes(thumb_path) }
  rescue StandardError
    nil
  end

  private

  def machine_identifier
    @machine_identifier ||= get('/identity').dig('MediaContainer', 'machineIdentifier')
  end

  def sections_cache_key              = "plex/server/#{@server_id}/sections"
  def section_cache_key(key, mtime)   = "plex/server/#{@server_id}/section/#{key}/#{mtime}"
  def poster_cache_key(rating_key)    = "plex/server/#{@server_id}/poster/#{rating_key}"
  def movie_detail_cache_key(movie)   = "plex/server/#{@server_id}/movie/detail/#{movie[:id]}/#{movie[:updated_at]}"

  def http_start(uri, &)
    Net::HTTP.start(
      uri.hostname, uri.port,
      use_ssl: uri.scheme == 'https',
      open_timeout: OPEN_TIMEOUT,
      read_timeout: READ_TIMEOUT,
      &
    )
  end

  def fetch_poster_bytes(thumb_path)
    uri     = URI("#{@base_url}#{thumb_path}")
    request = Net::HTTP::Get.new(uri)
    request['X-Plex-Token'] = @token

    response = http_start(uri) { |http| http.request(request) }
    return nil unless response.is_a?(Net::HTTPSuccess)

    { data: response.body.b, content_type: response['Content-Type'] || 'image/jpeg' }
  end

  def fetch_movie_sections
    data = get('/library/sections')
    (data.dig('MediaContainer', 'Directory') || []).select { |d| d['type'] == 'movie' }
  end

  def fetch_section_movies(key, machine_id)
    data  = get("/library/sections/#{key}/all")
    items = data.dig('MediaContainer', 'Metadata') || []
    items.flat_map do |item|
      plex_url = "https://app.plex.tv/desktop/#!/server/#{machine_id}/details?key=#{CGI.escape("/library/metadata/#{item['ratingKey']}")}"
      (item['Media'] || []).flat_map do |media|
        (media['Part'] || []).map do |part|
          {
            id: item['ratingKey'],
            title: item['title'],
            original_title: item['originalTitle'],
            year: item['year'],
            file_path: part['file'],
            container: media['container'],
            video_codec: media['videoCodec'],
            video_resolution: media['videoResolution'],
            width: media['width'],
            height: media['height'],
            aspect_ratio: media['aspectRatio'],
            frame_rate: media['videoFrameRate'],
            audio_codec: media['audioCodec'],
            audio_channels: media['audioChannels'],
            bitrate: media['bitrate'],
            size: part['size'],
            duration: media['duration'],
            updated_at: item['updatedAt'],
            thumb: item['thumb'],
            plex_url: plex_url
          }
        end
      end
    end
  end

  def fetch_movie_detail(rating_key)
    item = get("/library/metadata/#{rating_key}").dig('MediaContainer', 'Metadata', 0) || {}
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

  def get(path)
    uri     = URI("#{@base_url}#{path}")
    request = Net::HTTP::Get.new(uri)
    request['Accept']       = 'application/json'
    request['X-Plex-Token'] = @token

    response = http_start(uri) { |http| http.request(request) }
    unless response.is_a?(Net::HTTPSuccess)
      raise "Plex returned HTTP #{response.code} — check your server URL and token"
    end

    JSON.parse(response.body)
  rescue JSON::ParserError
    raise 'Plex returned an unexpected response — check your server URL and token'
  end
end
