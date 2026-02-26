class PlexService
  BASE_URL = ENV.fetch("PLEX_URL", "https://plex.forse.co")
  TOKEN = ENV["PLEX_TOKEN"]

  def sections
    fetch_movie_sections.map do |section|
      {
        title: section["title"],
        movies: fetch_section_movies(section["key"]).sort_by { |m| m[:title].downcase }
      }
    end
  end

  private

  def fetch_movie_sections
    data = get("/library/sections")
    directories = data.dig("MediaContainer", "Directory") || []
    directories.select { |d| d["type"] == "movie" }
  end

  def fetch_section_movies(key)
    data = get("/library/sections/#{key}/all")
    items = data.dig("MediaContainer", "Metadata") || []
    items.flat_map do |item|
      parts = (item["Media"] || []).flat_map { |m| m["Part"] || [] }
      parts.map { |part| { title: item["title"], file_path: part["file"] } }
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
