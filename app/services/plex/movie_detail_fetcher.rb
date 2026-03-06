# frozen_string_literal: true

module Plex
  class MovieDetailFetcher
    def initialize(http_client, parser: MovieDetailParser.new)
      @http_client = http_client
      @parser = parser
    end

    def fetch(media_id)
      item = metadata_for(media_id)
      @parser.parse(item)
    rescue StandardError
      {}
    end

    def metadata_for(media_id)
      @http_client.get("/library/metadata/#{media_id}").dig('MediaContainer', 'Metadata', 0) || {}
    end
  end
end
