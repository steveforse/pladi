# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::RatingsParser do
  subject(:parsed) { described_class.new.parse(item) }

  context 'when ratings are missing' do
    let(:item) { {} }

    it 'returns nil imdb rating' do
      expect(parsed[:imdb_rating]).to be_nil
    end
  end

  context 'when rotten tomatoes type does not match' do
    let(:item) do
      {
        'Rating' => [
          { 'image' => 'rottentomatoes://rating', 'type' => 'other', 'value' => 9.5 }
        ]
      }
    end

    it 'returns nil critics rating' do
      expect(parsed[:rt_critics_rating]).to be_nil
    end

    it 'returns nil audience rating' do
      expect(parsed[:rt_audience_rating]).to be_nil
    end
  end
end
