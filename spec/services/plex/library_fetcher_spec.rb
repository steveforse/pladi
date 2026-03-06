# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::LibraryFetcher do
  subject(:fetcher) { described_class.new(http_client, cache_store) }

  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:cache_store) { instance_double(Plex::CacheStore) }

  describe '#fetch_sections' do
    let(:show_payload) do
      {
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
    end
    let(:episodes_payload) do
      {
        'MediaContainer' => {
          'Metadata' => [
            {
              'ratingKey' => '401',
              'title' => 'Pilot',
              'titleSort' => 'Pilot Sort',
              'grandparentTitle' => 'Show A',
              'parentIndex' => 1,
              'index' => 1,
              'updatedAt' => 300,
              'Director' => [{ 'tag' => 'Aoife McArdle' }],
              'Writer' => [{ 'tag' => 'Dan Erickson' }],
              'Rating' => [
                { 'image' => 'imdb://image.rating', 'value' => 8.4 },
                { 'image' => 'rottentomatoes://rating', 'type' => 'critic', 'value' => 9.0 },
                { 'image' => 'rottentomatoes://rating', 'type' => 'audience', 'value' => 8.7 },
                { 'image' => 'themoviedb://rating', 'value' => 8.2 }
              ],
              'Media' => [
                {
                  'container' => 'mkv',
                  'videoCodec' => 'h264',
                  'audioCodec' => 'aac',
                  'duration' => 2_700_000,
                  'Part' => [
                    {
                      'file' => '/tv/show_a/s01e01.mkv',
                      'size' => 1234,
                      'Stream' => [
                        { 'streamType' => 2, 'language' => 'English', 'bitrate' => 192 },
                        { 'streamType' => 3, 'language' => 'English' }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    end
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
                  'videoBitrate' => 5600,
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
    let(:result) { fetcher.fetch_sections(scope: movie_scope) }
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
      expect(movies.last).to include(file_path: '/movies/z.mkv', video_codec: 'h264', audio_channels: 6,
                                     video_bitrate: 5600)
    end

    it 'uses section id and timestamp when reading cache' do
      result

      expect(cache_store).to have_received(:cached_movies_for).with('1', 100, media_type: 'movie', view_mode: 'shows')
    end

    context 'when fetching show sections' do
      let(:shows) { fetcher.fetch_sections(scope: shows_scope) }
      let(:show_row) { shows.first[:movies].first }

      before do
        allow(http_client).to receive(:get).with('/library/sections/2/all').and_return(show_payload)
      end

      it { expect(shows.first).to include(id: '2', updated_at: 200, title: 'Shows') }

      it { expect(shows.first[:movies].size).to eq(1) }
      it { expect(show_row[:media_type]).to eq('show') }
      it { expect(show_row[:id]).to eq('301') }
      it { expect(show_row[:title]).to eq('Show A') }
      it { expect(show_row[:file_path]).to be_nil }
      it { expect(show_row[:season_count]).to eq(4) }
      it { expect(show_row[:episode_count]).to eq(36) }
      it { expect(show_row[:viewed_episode_count]).to eq(12) }
    end

    context 'when fetching episode rows' do
      let(:episodes) { fetcher.fetch_sections(scope: episodes_scope) }
      let(:episode_row) { episodes.first[:movies].first }

      before do
        allow(http_client).to receive(:get).with('/library/sections/2/all?type=4').and_return(episodes_payload)
      end

      it { expect(episodes.first).to include(id: '2', updated_at: 200, title: 'Shows') }

      it { expect(episode_row[:media_type]).to eq('episode') }
      it { expect(episode_row[:id]).to eq('401') }
      it { expect(episode_row[:title]).to eq('Pilot') }
      it { expect(episode_row[:show_title]).to eq('Show A') }
      it { expect(episode_row[:sort_title]).to eq('Pilot Sort') }
      it { expect(episode_row[:episode_number]).to eq('S01E01') }
      it { expect(episode_row[:file_path]).to eq('/tv/show_a/s01e01.mkv') }
      it { expect(episode_row[:container]).to eq('mkv') }
      it { expect(episode_row[:video_codec]).to eq('h264') }
      it { expect(episode_row[:audio_codec]).to eq('aac') }
      it { expect(episode_row[:imdb_rating]).to eq(8.4) }
      it { expect(episode_row[:rt_critics_rating]).to eq(9.0) }
      it { expect(episode_row[:rt_audience_rating]).to eq(8.7) }
      it { expect(episode_row[:tmdb_rating]).to eq(8.2) }
      it { expect(episode_row[:directors]).to eq('Aoife McArdle') }
      it { expect(episode_row[:writers]).to eq('Dan Erickson') }
      it { expect(episode_row[:subtitles]).to eq('English') }
      it { expect(episode_row[:audio_tracks]).to eq('1') }
      it { expect(episode_row[:audio_language]).to eq('English') }
    end

    def movie_scope
      Plex::MediaScope.movies
    end

    def shows_scope
      Plex::MediaScope.shows('shows')
    end

    def episodes_scope
      Plex::MediaScope.shows('episodes')
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
