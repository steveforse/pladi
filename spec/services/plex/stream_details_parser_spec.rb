# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::StreamDetailsParser do
  subject(:parsed) { described_class.new.parse(item) }

  let(:item) do
    {
      'Media' => [
        {
          'Part' => [
            {
              'file' => '/movies/no-selected.mkv',
              'Stream' => [
                { 'streamType' => '2', 'languageTag' => 'fr', 'codec' => nil, 'selected' => false },
                { 'streamType' => '1' }
              ]
            },
            {
              'file' => '/movies/no-streams.mkv'
            }
          ]
        }
      ]
    }
  end

  it 'uses languageTag when language is missing' do
    expect(parsed[:audio_by_file]['/movies/no-selected.mkv']).to eq('fr')
  end

  it 'returns nil audio language when no selected stream exists' do
    expect(parsed[:audio_language_by_file]['/movies/no-selected.mkv']).to be_nil
  end

  it 'returns nil audio bitrate when no selected stream exists' do
    expect(parsed[:audio_bitrate_by_file]['/movies/no-selected.mkv']).to be_nil
  end

  it 'returns nil video bitrate when first video stream has no bitrate' do
    expect(parsed[:video_bitrate_by_file]['/movies/no-selected.mkv']).to be_nil
  end

  it 'returns nil subtitle summary when part has no subtitle streams' do
    expect(parsed[:subtitles_by_file]['/movies/no-streams.mkv']).to be_nil
  end

  context 'when subtitle codec is missing' do
    subject(:parsed_without_codec) { described_class.new.parse(item_without_codec) }

    let(:item_without_codec) do
      {
        'Media' => [
          {
            'Part' => [
              {
                'file' => '/movies/subtitle-no-codec.mkv',
                'Stream' => [{ 'streamType' => '3', 'displayTitle' => 'English' }]
              }
            ]
          }
        ]
      }
    end

    it 'still formats subtitle text without raising' do
      expect(parsed_without_codec[:subtitles_by_file]['/movies/subtitle-no-codec.mkv']).to eq('English ()')
    end
  end
end
