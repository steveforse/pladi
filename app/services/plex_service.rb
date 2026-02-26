class PlexService
  BASE_URL = ENV.fetch("PLEX_URL", "https://plex.forse.co")
  TOKEN = ENV["PLEX_TOKEN"]

  def sections
    machine_id = fetch_machine_identifier
    fetch_movie_sections.map do |section|
      {
        title: section["title"],
        movies: fetch_section_movies(section["key"], machine_id).sort_by { |m| m[:title].downcase }
      }
    end
  end

  private

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
            bitrate: media["bitrate"],
            size: part["size"],
            duration: media["duration"],
            plex_url: plex_url
          }
        end
      end
    end
  end

  def get(path)
    uri = URI("#{BASE_URL}#{path}")
    request = Net::HTTP::Get.new(uri)
    request["Accept"] = "application/json"
    request["X-Plex-Token"] = TOKEN

    response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
      http.request(request)
    end

    JSON.parse(response.body)
  end
end
