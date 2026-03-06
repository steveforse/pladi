# frozen_string_literal: true

module Plex
  module MediaDetailFields
    MOVIE_FIELDS = %i[summary content_rating edition].freeze
    EPISODE_FIELDS = %i[summary content_rating].freeze
    SHOW_FIELDS = %i[
      summary content_rating studio tagline season_count episode_count viewed_episode_count
    ].freeze

    ATTRIBUTE_MAP = {
      summary: 'summary',
      content_rating: 'contentRating',
      edition: 'editionTitle',
      studio: 'studio',
      tagline: 'tagline',
      season_count: 'childCount',
      episode_count: 'leafCount',
      viewed_episode_count: 'viewedLeafCount'
    }.freeze

    def self.extract(source, *fields)
      fields.index_with { |field| source[ATTRIBUTE_MAP.fetch(field)] }
    end
  end
end
