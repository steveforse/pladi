# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::MovieDetailParser do
  subject(:result) { described_class.new.parse(item) }

  let(:item) do
    {
      'summary' => 'A movie summary',
      'contentRating' => 'PG-13',
      'editionTitle' => 'Director Cut',
      'Genre' => [{ 'tag' => 'Drama' }],
      'Director' => [{ 'tag' => 'Director Name' }],
      'Country' => [{ 'tag' => 'USA' }],
      'Writer' => [{ 'tag' => 'Writer Name' }],
      'Producer' => [{ 'tag' => 'Producer Name' }],
      'Collection' => [{ 'tag' => 'Collection A' }],
      'Label' => [{ 'tag' => 'Label A' }],
      'Rating' => [
        { 'image' => 'imdb://image.rating', 'value' => 7.7 },
        { 'image' => 'rottentomatoes://rating', 'type' => 'critic', 'value' => 8.0 },
        { 'image' => 'rottentomatoes://rating', 'type' => 'audience', 'value' => 8.2 },
        { 'image' => 'themoviedb://rating', 'value' => 7.9 }
      ],
      'Media' => [
        {
          'Part' => [
            {
              'file' => '/movies/a.mkv',
              'Stream' => [
                { 'streamType' => '3', 'displayTitle' => 'English', 'codec' => 'srt' },
                {
                  'streamType' => '2',
                  'language' => 'English',
                  'codec' => 'aac',
                  'channels' => 6,
                  'bitrate' => 640,
                  'selected' => true
                },
                { 'streamType' => '1', 'bitrate' => 12_000 }
              ]
            }
          ]
        }
      ]
    }
  end

  it { expect(result[:summary]).to eq('A movie summary') }
  it { expect(result[:content_rating]).to eq('PG-13') }
  it { expect(result[:edition]).to eq('Director Cut') }
  it { expect(result[:imdb_rating]).to eq(7.7) }
  it { expect(result[:rt_critics_rating]).to eq(8.0) }
  it { expect(result[:rt_audience_rating]).to eq(8.2) }
  it { expect(result[:tmdb_rating]).to eq(7.9) }
  it { expect(result[:genres]).to eq('Drama') }
  it { expect(result[:directors]).to eq('Director Name') }
  it { expect(result[:country]).to eq('USA') }
  it { expect(result[:writers]).to eq('Writer Name') }
  it { expect(result[:producers]).to eq('Producer Name') }
  it { expect(result[:collections]).to eq('Collection A') }
  it { expect(result[:labels]).to eq('Label A') }
  it { expect(result[:subtitles_by_file]).to eq('/movies/a.mkv' => 'English (SRT)') }
  it { expect(result[:audio_by_file]).to eq('/movies/a.mkv' => 'English (AAC, 6ch, 640 kbps)') }
  it { expect(result[:audio_language_by_file]).to eq('/movies/a.mkv' => 'English') }
  it { expect(result[:audio_bitrate_by_file]).to eq('/movies/a.mkv' => 640) }
  it { expect(result[:video_bitrate_by_file]).to eq('/movies/a.mkv' => 12_000) }
end
