# frozen_string_literal: true

module Plex
  class MediaDetailFetcher
    def initialize(http_client, parser:)
      @http_client = http_client
      @parser = parser
    end

    def fetch(media_id)
      @parser.parse(metadata_for(media_id))
    rescue StandardError
      {}
    end

    def metadata_for(media_id)
      @http_client.get("/library/metadata/#{media_id}").dig('MediaContainer', 'Metadata', 0) || {}
    end
  end
end
