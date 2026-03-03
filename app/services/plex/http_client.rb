# frozen_string_literal: true

module Plex
  class HttpClient
    OPEN_TIMEOUT = 5
    READ_TIMEOUT = 30

    def initialize(server)
      @url   = server.url
      @token = server.token
    end

    def get(path)
      uri     = URI("#{@url}#{path}")
      request = Net::HTTP::Get.new(uri)
      request['Accept']       = 'application/json'
      request['X-Plex-Token'] = @token
      response = http_start(uri) { |http| http.request(request) }
      raise "Plex returned HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)
    rescue JSON::ParserError
      raise 'Plex returned an unexpected response — check your server URL and token'
    end

    def put(path)
      uri     = URI("#{@url}#{path}")
      request = Net::HTTP::Put.new(uri)
      request['Accept']       = 'application/json'
      request['X-Plex-Token'] = @token
      response = http_start(uri) { |http| http.request(request) }
      raise "Plex returned HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)
    end

    def get_image(path)
      uri      = URI("#{@url}#{path}")
      response = image_get(uri, token: @token)
      response = follow_image_redirect(response) if response.is_a?(Net::HTTPRedirection)
      return nil unless response.is_a?(Net::HTTPSuccess)

      content_type = response['Content-Type'] || 'image/jpeg'
      { data: response.body.b, content_type: content_type }
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

    def image_get(uri, token: nil)
      request = Net::HTTP::Get.new(uri)
      request['Accept'] = 'image/jpeg, image/png, image/*'
      request['X-Plex-Token'] = token if token
      http_start(uri) { |http| http.request(request) }
    end

    def follow_image_redirect(response)
      return response unless response['Location']

      redirect_uri = URI(response['Location'])
      image_get(redirect_uri)
    end
  end
end
