# frozen_string_literal: true

module Plex
  class MovieDetailFetcher
    def initialize(http_client, parser: MovieDetailParser.new)
      @http_client = http_client
      @parser = parser
    end

    def fetch(movie_id)
      item = @http_client.get("/library/metadata/#{movie_id}").dig('MediaContainer', 'Metadata', 0) || {}
      @parser.parse(item)
    rescue StandardError
      {}
    end
  end
end
