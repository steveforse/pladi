# frozen_string_literal: true

module Plex
  class ShowDetailFetcher < MediaDetailFetcher
    def initialize(http_client, parser: ShowDetailParser.new)
      super
    end
  end
end
