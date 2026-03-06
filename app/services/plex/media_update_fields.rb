# frozen_string_literal: true

module Plex
  module MediaUpdateFields
    SCALAR_FIELD_MAP = {
      'title' => 'title',
      'original_title' => 'originalTitle',
      'sort_title' => 'titleSort',
      'year' => 'year',
      'edition' => 'editionTitle',
      'summary' => 'summary',
      'tagline' => 'tagline',
      'studio' => 'studio',
      'content_rating' => 'contentRating',
      'originally_available' => 'originallyAvailableAt'
    }.freeze

    COMMON_PARAMS = %i[
      title original_title sort_title summary tagline studio content_rating year originally_available
    ].freeze

    def self.permitted_params(extra_fields: [])
      tag_params = MediaTagFields::UPDATE_TAG_MAP.transform_keys(&:to_sym).transform_values { [] }
      (COMMON_PARAMS + extra_fields + [tag_params]).freeze
    end
  end
end
