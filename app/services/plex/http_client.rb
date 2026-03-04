# frozen_string_literal: true

module Plex
  class HttpClient
    class RequestError < StandardError; end

    OPEN_TIMEOUT = 5
    READ_TIMEOUT = 30

    def initialize(server)
      @url   = server.url
      @token = server.token
    end

    def get(path)
      with_request_error_handling do
        uri = URI("#{@url}#{path}")
        response = http_start(uri) { |http| http.request(json_get_request(uri)) }
        raise RequestError, "Plex returned HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

        parse_json_body!(response.body)
      end
    end

    def put(path)
      with_request_error_handling do
        uri     = URI("#{@url}#{path}")
        request = Net::HTTP::Put.new(uri)
        request['Accept']       = 'application/json'
        request['X-Plex-Token'] = @token
        response = http_start(uri) { |http| http.request(request) }
        raise RequestError, "Plex returned HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)
      end
    end

    def get_image(path)
      with_request_error_handling do
        uri      = URI("#{@url}#{path}")
        response = image_get(uri, token: @token)
        response = follow_image_redirect(response) if response.is_a?(Net::HTTPRedirection)
        return nil unless response.is_a?(Net::HTTPSuccess)

        content_type = response['Content-Type'] || 'image/jpeg'
        { data: response.body.b, content_type: content_type }
      end
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

    def json_get_request(uri)
      request = Net::HTTP::Get.new(uri)
      request['Accept']       = 'application/json'
      request['X-Plex-Token'] = @token
      request
    end

    def parse_json_body!(body)
      JSON.parse(body)
    rescue JSON::ParserError
      raise RequestError, 'Plex returned an unexpected response — check your server URL and token'
    end

    def follow_image_redirect(response)
      return response unless response['Location']

      redirect_uri = URI(response['Location'])
      image_get(redirect_uri)
    end

    def with_request_error_handling
      yield
    rescue RequestError
      raise
    rescue URI::InvalidURIError
      raise RequestError, 'Plex server URL is invalid'
    rescue SocketError, Net::OpenTimeout, Net::ReadTimeout,
           Errno::ECONNREFUSED, Errno::EHOSTUNREACH, Errno::ETIMEDOUT => e
      raise RequestError, "Unable to reach Plex server: #{e.message}"
    end
  end
end
