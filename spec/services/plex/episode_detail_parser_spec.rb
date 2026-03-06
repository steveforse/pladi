# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::EpisodeDetailParser do
  subject(:result) { described_class.new.parse(item) }

  let(:item) do
    {
      'summary' => 'Episode summary',
      'contentRating' => 'TV-MA',
      'Director' => [{ 'tag' => 'Director Name' }],
      'Writer' => [{ 'tag' => 'Writer Name' }],
      'Rating' => [
        { 'image' => 'imdb://image.rating', 'value' => 8.5 }
      ],
      'Media' => [
        {
          'Part' => [
            {
              'file' => '/tv/show/s01e01.mkv',
              'Stream' => [
                { 'streamType' => '3', 'displayTitle' => 'English', 'codec' => 'srt' },
                { 'streamType' => '1', 'bitrate' => 3200 }
              ]
            }
          ]
        }
      ]
    }
  end

  it { expect(result[:summary]).to eq('Episode summary') }
  it { expect(result[:content_rating]).to eq('TV-MA') }
  it { expect(result[:directors]).to eq('Director Name') }
  it { expect(result[:writers]).to eq('Writer Name') }
  it { expect(result[:imdb_rating]).to eq(8.5) }
  it { expect(result[:subtitles_by_file]).to eq('/tv/show/s01e01.mkv' => 'English (SRT)') }
  it { expect(result[:video_bitrate_by_file]).to eq('/tv/show/s01e01.mkv' => 3200) }
end
