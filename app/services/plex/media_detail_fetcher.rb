# frozen_string_literal: true

module Plex
  class MediaDetailFetcher
    def initialize(http_client, parser:, metadata_fetcher: MediaMetadataFetcher.new(http_client))
      @metadata_fetcher = metadata_fetcher
      @parser = parser
    end

    def fetch(media_id)
      metadata = metadata_for(media_id)
      return {} if metadata.blank?

      @parser.parse(metadata)
    rescue StandardError
      {}
    end

    def metadata_for(media_id)
      @metadata_fetcher.fetch(media_id)
    end
  end
end
