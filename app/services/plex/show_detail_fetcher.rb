# frozen_string_literal: true

module Plex
  class ShowDetailFetcher
    def initialize(http_client, parser: ShowDetailParser.new)
      @http_client = http_client
      @parser = parser
    end

    def fetch(show_id)
      item = @http_client.get("/library/metadata/#{show_id}").dig('MediaContainer', 'Metadata', 0) || {}
      @parser.parse(item)
    rescue StandardError
      {}
    end
  end
end
