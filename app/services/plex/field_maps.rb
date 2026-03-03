# frozen_string_literal: true

module Plex
  module FieldMaps
    SCALAR_FIELD_MAP = {
      'title' => 'title', 'original_title' => 'originalTitle',
      'sort_title' => 'titleSort', 'year' => 'year',
      'edition' => 'editionTitle', 'summary' => 'summary',
      'tagline' => 'tagline', 'studio' => 'studio',
      'content_rating' => 'contentRating',
      'originally_available' => 'originallyAvailableAt'
    }.freeze

    TAG_FIELD_MAP = {
      'genres' => 'Genre', 'directors' => 'Director',
      'writers' => 'Writer', 'producers' => 'Producer',
      'collections' => 'Collection', 'labels' => 'Label',
      'country' => 'Country'
    }.freeze
  end
end
