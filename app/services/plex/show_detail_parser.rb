# frozen_string_literal: true

module Plex
  class ShowDetailParser
    TAG_FIELDS = {
      directors: 'Director',
      genres: 'Genre',
      country: 'Country',
      writers: 'Writer',
      producers: 'Producer',
      collections: 'Collection',
      labels: 'Label'
    }.freeze

    def initialize(ratings_parser: RatingsParser.new)
      @ratings_parser = ratings_parser
    end

    def parse(item)
      base_fields(item)
        .merge(@ratings_parser.parse(item))
    end

    private

    def base_fields(item)
      {
        summary: item['summary'],
        content_rating: item['contentRating'],
        studio: item['studio'],
        tagline: item['tagline'],
        season_count: item['childCount'],
        episode_count: item['leafCount'],
        viewed_episode_count: item['viewedLeafCount']
      }.merge(tag_fields(item))
    end

    def tag_fields(item)
      TAG_FIELDS.transform_values { |key| TagFormatter.join(item[key]) }
    end
  end
end
