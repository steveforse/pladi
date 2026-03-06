# frozen_string_literal: true

module Plex
  class EpisodeDetailParser
    def initialize(stream_parser: StreamDetailsParser.new, ratings_parser: RatingsParser.new)
      @stream_parser = stream_parser
      @ratings_parser = ratings_parser
    end

    def parse(item)
      @stream_parser.parse(item)
        .merge(base_fields(item))
        .merge(@ratings_parser.parse(item))
    end

    private

    def base_fields(item)
      MediaDetailFields.extract(item, *MediaDetailFields::EPISODE_FIELDS)
        .merge(MediaTagFields.values_for(item))
    end
  end
end
