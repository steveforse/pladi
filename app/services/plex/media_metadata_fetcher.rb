# frozen_string_literal: true

module Plex
  class MediaMetadataFetcher
    def initialize(http_client)
      @http_client = http_client
    end

    def fetch(media_id)
      @http_client.get("/library/metadata/#{media_id}").dig('MediaContainer', 'Metadata', 0) || {}
    rescue StandardError
      {}
    end
  end
end
