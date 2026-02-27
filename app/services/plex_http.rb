# frozen_string_literal: true

class PlexHttp
  OPEN_TIMEOUT = 5  # seconds to establish TCP connection
  READ_TIMEOUT = 30 # seconds to wait for response data

  def initialize(base_url, token)
    @base_url = base_url
    @token    = token
  end

  def get(path)
    uri     = URI("#{@base_url}#{path}")
    request = Net::HTTP::Get.new(uri)
    request['Accept']       = 'application/json'
    request['X-Plex-Token'] = @token
    response = http_start(uri) { |http| http.request(request) }
    check_response!(response)
    JSON.parse(response.body)
  rescue JSON::ParserError
    raise 'Plex returned an unexpected response — check your server URL and token'
  end

  def fetch_poster_bytes(thumb_path)
    uri     = URI("#{@base_url}#{thumb_path}")
    request = Net::HTTP::Get.new(uri)
    request['X-Plex-Token'] = @token
    response = http_start(uri) { |http| http.request(request) }
    return nil unless response.is_a?(Net::HTTPSuccess)

    { data: response.body.b, content_type: response['Content-Type'] || 'image/jpeg' }
  end

  private

  def http_start(uri, &)
    Net::HTTP.start(
      uri.hostname, uri.port,
      use_ssl: uri.scheme == 'https',
      open_timeout: OPEN_TIMEOUT,
      read_timeout: READ_TIMEOUT,
      &
    )
  end

  def check_response!(response)
    return if response.is_a?(Net::HTTPSuccess)

    raise "Plex returned HTTP #{response.code} — check your server URL and token"
  end
end
