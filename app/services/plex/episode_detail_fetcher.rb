# frozen_string_literal: true

module Plex
  class EpisodeDetailFetcher < MediaDetailFetcher
    def initialize(http_client, parser: EpisodeDetailParser.new)
      super
    end
  end
end
