# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::ShowDetailParser do
  subject(:result) { described_class.new.parse(item) }

  let(:item) do
    {
      'summary' => 'A show summary',
      'contentRating' => 'TV-MA',
      'studio' => 'HBO',
      'tagline' => 'Winter is coming',
      'childCount' => 8,
      'leafCount' => 73,
      'viewedLeafCount' => 50,
      'Genre' => [{ 'tag' => 'Drama' }, { 'tag' => 'Fantasy' }],
      'Country' => [{ 'tag' => 'USA' }],
      'Writer' => [{ 'tag' => 'Writer Name' }],
      'Producer' => [{ 'tag' => 'Producer Name' }],
      'Collection' => [{ 'tag' => 'Collection A' }],
      'Label' => [{ 'tag' => 'Label A' }],
      'Rating' => [
        { 'image' => 'imdb://image.rating', 'value' => 8.9 },
        { 'image' => 'rottentomatoes://rating', 'type' => 'critic', 'value' => 9.0 },
        { 'image' => 'rottentomatoes://rating', 'type' => 'audience', 'value' => 8.6 },
        { 'image' => 'themoviedb://rating', 'value' => 8.7 }
      ]
    }
  end

  it { expect(result[:summary]).to eq('A show summary') }
  it { expect(result[:content_rating]).to eq('TV-MA') }
  it { expect(result[:studio]).to eq('HBO') }
  it { expect(result[:tagline]).to eq('Winter is coming') }
  it { expect(result[:season_count]).to eq(8) }
  it { expect(result[:episode_count]).to eq(73) }
  it { expect(result[:viewed_episode_count]).to eq(50) }
  it { expect(result[:genres]).to eq('Drama, Fantasy') }
  it { expect(result[:country]).to eq('USA') }
  it { expect(result[:writers]).to eq('Writer Name') }
  it { expect(result[:producers]).to eq('Producer Name') }
  it { expect(result[:collections]).to eq('Collection A') }
  it { expect(result[:labels]).to eq('Label A') }
  it { expect(result[:imdb_rating]).to eq(8.9) }
  it { expect(result[:rt_critics_rating]).to eq(9.0) }
  it { expect(result[:rt_audience_rating]).to eq(8.6) }
  it { expect(result[:tmdb_rating]).to eq(8.7) }
end
