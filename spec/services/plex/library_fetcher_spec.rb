# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::LibraryFetcher do
  subject(:fetcher) { described_class.new(http_client, cache_store) }

  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:cache_store) { instance_double(Plex::CacheStore) }

  describe '#fetch_sections' do
    let(:sections_payload) do
      {
        'MediaContainer' => {
          'Directory' => [
            { 'key' => '1', 'title' => 'Movies A', 'type' => 'movie', 'updatedAt' => 100 },
            { 'key' => '2', 'title' => 'Shows', 'type' => 'show', 'updatedAt' => 200 }
          ]
        }
      }
    end
    let(:section_payload) do
      {
        'MediaContainer' => {
          'Metadata' => [
            {
              'ratingKey' => '101',
              'title' => 'zTitle',
              'originalTitle' => 'Original Z',
              'year' => 2020,
              'titleSort' => 'Z Sort',
              'originallyAvailableAt' => '2020-01-01',
              'studio' => 'Studio Z',
              'tagline' => 'Tagline Z',
              'updatedAt' => 100,
              'thumb' => '/thumb-z',
              'art' => '/art-z',
              'Media' => [
                {
                  'container' => 'mkv',
                  'videoCodec' => 'h264',
                  'videoResolution' => '1080',
                  'width' => 1920,
                  'height' => 1080,
                  'aspectRatio' => 1.78,
                  'videoFrameRate' => '24p',
                  'audioCodec' => 'aac',
                  'audioChannels' => 6,
                  'bitrate' => 9000,
                  'duration' => 7_200_000,
                  'Part' => [{ 'file' => '/movies/z.mkv', 'size' => 1000 }]
                }
              ]
            },
            {
              'ratingKey' => '102',
              'title' => 'aTitle',
              'Media' => [
                {
                  'container' => 'mp4',
                  'Part' => [{ 'file' => '/movies/a.mp4', 'size' => 500 }]
                }
              ]
            }
          ]
        }
      }
    end
    let(:result) { fetcher.fetch_sections }
    let(:movies) { result.first[:movies] }

    before do
      allow(http_client).to receive(:get).with('/library/sections').and_return(sections_payload)
      allow(http_client).to receive(:get).with('/library/sections/1/all').and_return(section_payload)
      allow(http_client).to receive(:get).with('/identity').and_return(
        'MediaContainer' => { 'machineIdentifier' => 'machine-1' }
      )
      allow(cache_store).to receive(:cached_movies_for).and_yield
    end

    it 'includes only movie sections' do
      expect(result.size).to eq(1)
    end

    it 'returns section metadata' do
      expect(result.first).to include(id: '1', updated_at: 100, title: 'Movies A')
    end

    it 'sorts movies by title' do
      expect(movies.pluck(:title)).to eq(%w[aTitle zTitle])
    end

    it 'builds plex urls with machine identifier' do
      expect(movies.first[:plex_url]).to eq(
        'https://app.plex.tv/desktop/#!/server/machine-1/details?key=%2Flibrary%2Fmetadata%2F102'
      )
    end

    it 'maps part and media attributes' do
      expect(movies.last).to include(file_path: '/movies/z.mkv', video_codec: 'h264', audio_channels: 6)
    end

    it 'uses section id and timestamp when reading cache' do
      result

      expect(cache_store).to have_received(:cached_movies_for).with('1', 100)
    end

    it 'can fetch show sections when requested' do
      show_payload = {
        'MediaContainer' => {
          'Metadata' => [
            {
              'ratingKey' => '301',
              'title' => 'Show A',
              'year' => 2022,
              'childCount' => 4,
              'leafCount' => 36,
              'viewedLeafCount' => 12,
              'updatedAt' => 200,
              'thumb' => '/thumb-a',
              'art' => '/art-a'
            }
          ]
        }
      }
      allow(http_client).to receive(:get).with('/library/sections/2/all').and_return(show_payload)

      shows = fetcher.fetch_sections(media_type: 'show')

      expect(shows.first).to include(id: '2', updated_at: 200, title: 'Shows')
      expect(shows.first[:movies].size).to eq(1)
      expect(shows.first[:movies].first).to include(
        id: '301',
        title: 'Show A',
        file_path: nil,
        season_count: 4,
        episode_count: 36,
        viewed_episode_count: 12
      )
    end
  end

  describe '#machine_id' do
    before do
      allow(http_client).to receive(:get).with('/identity').and_return(
        'MediaContainer' => { 'machineIdentifier' => 'machine-1' }
      )
    end

    it 'fetches identity once for repeated reads' do
      fetcher.machine_id
      fetcher.machine_id

      expect(http_client).to have_received(:get).with('/identity').once
    end

    it 'returns machine identifier' do
      expect(fetcher.machine_id).to eq('machine-1')
    end
  end
end
