# frozen_string_literal: true

module Plex
  class ShowDetailParser
    def initialize(ratings_parser: RatingsParser.new)
      @ratings_parser = ratings_parser
    end

    def parse(item)
      base_fields(item)
        .merge(@ratings_parser.parse(item))
    end

    private

    def base_fields(item)
      MediaDetailFields.extract(item, *MediaDetailFields::SHOW_FIELDS)
        .merge(MediaTagFields.values_for(item))
    end
  end
end
