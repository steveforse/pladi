# frozen_string_literal: true

module Plex
  class MovieDetailFetcher < MediaDetailFetcher
    def initialize(http_client, parser: MovieDetailParser.new)
      super
    end
  end
end
