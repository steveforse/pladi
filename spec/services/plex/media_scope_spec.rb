# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::MediaScope do
  describe '.from_h' do
    it 'rebuilds the scope from serialized attributes' do
      scope = described_class.from_h('library_type' => 'show', 'view_mode' => 'episodes')

      expect(scope).to eq(described_class.shows('episodes'))
    end
  end

  describe '#to_h' do
    it 'serializes the scope attributes' do
      expect(described_class.movies.to_h).to eq(library_type: 'movie', view_mode: 'shows')
    end
  end

  describe '#hash' do
    it 'hashes library type and view mode' do
      expect(described_class.shows('episodes').hash).to eq(%w[show episodes].hash)
    end
  end
end
