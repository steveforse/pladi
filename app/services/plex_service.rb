class PlexService
  ENRICH_THREADS = ENV.fetch("PLEX_ENRICH_THREADS", "3").to_i

  def initialize(server)
    @base_url  = server.url
    @token     = server.token
    @server_id = server.id
  end

  def friendly_name
    get("/").dig("MediaContainer", "friendlyName")
  end

  def sections
    machine_id = fetch_machine_identifier
    fetch_movie_sections.map do |section|
      key   = section["key"]
      mtime = section["updatedAt"]
      movies = Rails.cache.fetch("plex/server/#{@server_id}/section/#{key}/#{mtime}", expires_in: 7.days) do
        fetch_section_movies(key, machine_id).sort_by { |m| m[:title].downcase }
      end
      { title: section["title"], movies: movies }
    end
  end

  def enrich_sections(sections)
    all_movies = sections.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
    queue  = all_movies.dup
    mutex  = Mutex.new
    details = {}

    threads = ENRICH_THREADS.times.map do
      Thread.new do
        loop do
          movie = mutex.synchronize { queue.shift }
          break if movie.nil?

          detail = Rails.cache.fetch(
            "plex/server/#{@server_id}/movie/detail/#{movie[:id]}/#{movie[:updated_at]}",
            expires_in: 30.days
          ) { fetch_movie_detail(movie[:id]) }

          mutex.synchronize { details[movie[:id]] = detail }
        end
      end
    end

    threads.each(&:join)

    sections.map do |section|
      {
        title: section[:title],
        movies: section[:movies].map { |m| m.merge(details[m[:id]] || {}) }
      }
    end
  end

  def poster_for(rating_key)
    Rails.cache.fetch(
      "plex/server/#{@server_id}/poster/#{rating_key}",
      expires_in: 30.days
    ) do
      thumb_path = get("/library/metadata/#{rating_key}").dig("MediaContainer", "Metadata", 0, "thumb")
      next nil unless thumb_path

      fetch_poster_bytes(thumb_path)
    end
  rescue StandardError
    nil
  end

  def poster_cached?(rating_key)
    Rails.cache.exist?("plex/server/#{@server_id}/poster/#{rating_key}")
  end

  def warm_poster(rating_key, thumb_path)
    Rails.cache.fetch(
      "plex/server/#{@server_id}/poster/#{rating_key}",
      expires_in: 30.days
    ) { fetch_poster_bytes(thumb_path) }
  rescue StandardError
    nil
  end

  private

  def fetch_poster_bytes(thumb_path)
    uri = URI("#{@base_url}#{thumb_path}")
    request = Net::HTTP::Get.new(uri)
    request["X-Plex-Token"] = @token

    response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
      http.request(request)
    end

    return nil unless response.is_a?(Net::HTTPSuccess)

    { data: response.body.b, content_type: response["Content-Type"] || "image/jpeg" }
  end

  def fetch_machine_identifier
    get("/identity").dig("MediaContainer", "machineIdentifier")
  end

  def fetch_movie_sections
    data = get("/library/sections")
    directories = data.dig("MediaContainer", "Directory") || []
    directories.select { |d| d["type"] == "movie" }
  end

  def fetch_section_movies(key, machine_id)
    data = get("/library/sections/#{key}/all")
    items = data.dig("MediaContainer", "Metadata") || []
    items.flat_map do |item|
      plex_url = "https://app.plex.tv/desktop/#!/server/#{machine_id}/details?key=#{CGI.escape("/library/metadata/#{item["ratingKey"]}")}"
      (item["Media"] || []).flat_map do |media|
        (media["Part"] || []).map do |part|
          {
            id: item["ratingKey"],
            title: item["title"],
            original_title: item["originalTitle"],
            year: item["year"],
            file_path: part["file"],
            container: media["container"],
            video_codec: media["videoCodec"],
            video_resolution: media["videoResolution"],
            width: media["width"],
            height: media["height"],
            aspect_ratio: media["aspectRatio"],
            frame_rate: media["videoFrameRate"],
            audio_codec: media["audioCodec"],
            audio_channels: media["audioChannels"],
            bitrate: media["bitrate"],
            size: part["size"],
            duration: media["duration"],
            updated_at: item["updatedAt"],
            thumb: item["thumb"],
            plex_url: plex_url
          }
        end
      end
    end
  end

  def fetch_movie_detail(rating_key)
    item = get("/library/metadata/#{rating_key}").dig("MediaContainer", "Metadata", 0) || {}
    {
      summary:         item["summary"],
      content_rating:  item["contentRating"],
      audience_rating: item["audienceRating"],
      genres:          (item["Genre"]    || []).map { |g| g["tag"] }.join(", "),
      directors:       (item["Director"] || []).map { |d| d["tag"] }.join(", ")
    }
  rescue StandardError
    {}
  end

  def get(path)
    uri = URI("#{@base_url}#{path}")
    request = Net::HTTP::Get.new(uri)
    request["Accept"] = "application/json"
    request["X-Plex-Token"] = @token

    response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
      http.request(request)
    end

    raise "Plex returned HTTP #{response.code} — check your server URL and token" unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  rescue JSON::ParserError
    raise "Plex returned an unexpected response — check your server URL and token"
  end
end
