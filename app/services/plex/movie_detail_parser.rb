# frozen_string_literal: true

module Plex
  class MovieDetailParser
    TAG_FIELDS = {
      genres: 'Genre',
      directors: 'Director',
      country: 'Country',
      writers: 'Writer',
      producers: 'Producer',
      collections: 'Collection',
      labels: 'Label'
    }.freeze

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
      {
        summary: item['summary'],
        content_rating: item['contentRating'],
        edition: item['editionTitle']
      }.merge(tag_fields(item))
    end

    def tag_fields(item)
      TAG_FIELDS.transform_values { |key| normalized_tags(item[key]) }
    end

    def normalized_tags(tags)
      (tags || []).pluck('tag').compact_blank.join(', ')
    end
  end
end
