# frozen_string_literal: true

module Plex
  module MediaTagFields
    UPDATE_TAG_MAP = {
      'genres' => 'Genre',
      'directors' => 'Director',
      'writers' => 'Writer',
      'producers' => 'Producer',
      'collections' => 'Collection',
      'labels' => 'Label',
      'country' => 'Country'
    }.freeze

    METADATA_TAG_MAP = UPDATE_TAG_MAP.transform_keys(&:to_sym).freeze

    def self.values_for(source)
      METADATA_TAG_MAP.transform_values { |key| TagFormatter.join(source[key]) }
    end
  end
end
