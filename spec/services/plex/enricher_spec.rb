# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::Enricher do
  subject(:enricher) { described_class.new(http_client, cache_store) }

  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:cache_store) { instance_double(Plex::CacheStore) }
  let(:movie_detail_fetcher) { instance_double(Plex::MovieDetailFetcher) }
  let(:show_detail_fetcher) { instance_double(Plex::ShowDetailFetcher) }
  let(:movie_concurrent_fetcher) { instance_double(Plex::ConcurrentDetailFetcher) }
  let(:show_concurrent_fetcher) { instance_double(Plex::ConcurrentDetailFetcher) }

  before do
    allow(Plex::MovieDetailFetcher).to receive(:new).with(http_client).and_return(movie_detail_fetcher)
    allow(Plex::ShowDetailFetcher).to receive(:new).with(http_client).and_return(show_detail_fetcher)
    allow(Plex::ConcurrentDetailFetcher).to receive(:new).with(
      cache_store: cache_store,
      detail_fetcher: movie_detail_fetcher,
      thread_count: described_class::ENRICH_THREADS
    ).and_return(movie_concurrent_fetcher)
    allow(Plex::ConcurrentDetailFetcher).to receive(:new).with(
      cache_store: cache_store,
      detail_fetcher: show_detail_fetcher,
      thread_count: described_class::ENRICH_THREADS
    ).and_return(show_concurrent_fetcher)
  end

  describe '#enrich_movie' do
    subject(:result) { enricher.enrich_movie('123', '/movies/a.mkv') }

    context 'with full stream detail maps' do
      before do
        allow(movie_detail_fetcher).to receive(:fetch).with('123').and_return(
          summary: 'My summary',
          subtitles_by_file: { '/movies/a.mkv' => 'English (SRT)' },
          audio_by_file: { '/movies/a.mkv' => 'English (AAC, 6ch, 640 kbps)' },
          audio_language_by_file: { '/movies/a.mkv' => 'English' },
          audio_bitrate_by_file: { '/movies/a.mkv' => 640 },
          video_bitrate_by_file: { '/movies/a.mkv' => 12_000 }
        )
      end

      it { expect(result[:summary]).to eq('My summary') }
      it { expect(result[:subtitles]).to eq('English (SRT)') }
      it { expect(result[:audio_tracks]).to eq('English (AAC, 6ch, 640 kbps)') }
      it { expect(result[:audio_language]).to eq('English') }
      it { expect(result[:audio_bitrate]).to eq(640) }
      it { expect(result[:video_bitrate]).to eq(12_000) }
      it { expect(result).not_to have_key(:subtitles_by_file) }
    end

    context 'when stream detail maps are missing' do
      before do
        allow(movie_detail_fetcher).to receive(:fetch).with('123').and_return(summary: 'Only summary')
      end

      it 'returns nil for subtitles' do
        expect(result[:subtitles]).to be_nil
      end
    end
  end

  describe '#enrich_sections' do
    let(:section) do
      {
        id: '10',
        updated_at: 1234,
        movies: [{ id: 'm1', file_path: '/movies/m1.mkv', title: 'Movie 1' }]
      }
    end
    let(:detail) do
      {
        summary: 'Detailed summary',
        subtitles_by_file: { '/movies/m1.mkv' => 'Thai (SRT)' }
      }
    end
    let(:result_movie) { enricher.enrich_sections([section]).first[:movies].first }

    before do
      allow(cache_store).to receive(:enrich_version).and_return(7)
      allow(cache_store).to receive(:key).with('section', 'movie', 'shows', '10', 1234, 'enriched', 7).and_return('section-cache-key')
      allow(cache_store).to receive(:fetch).with('section-cache-key').and_yield
      allow(movie_concurrent_fetcher).to receive(:fetch).with(section[:movies]).and_return('m1' => detail)
    end

    it { expect(result_movie[:id]).to eq('m1') }
    it { expect(result_movie[:title]).to eq('Movie 1') }
    it { expect(result_movie[:summary]).to eq('Detailed summary') }
    it { expect(result_movie[:subtitles]).to eq('Thai (SRT)') }

    it 'preserves existing stream-derived values when detail omits them' do
      section_with_existing_bitrate = {
        id: '10',
        updated_at: 1234,
        movies: [{ id: 'm1', file_path: '/movies/m1.mkv', title: 'Movie 1', video_bitrate: 2_400 }]
      }
      detail_without_stream_fields = { summary: 'Detailed summary' }
      allow(movie_concurrent_fetcher).to receive(:fetch).with(section_with_existing_bitrate[:movies]).and_return('m1' => detail_without_stream_fields)

      result = enricher.enrich_sections([section_with_existing_bitrate]).first[:movies].first
      expect(result[:video_bitrate]).to eq(2_400)
    end
  end

  describe '#enrich_show' do
    it 'returns parsed show detail' do
      allow(show_detail_fetcher).to receive(:fetch).with('s1').and_return(summary: 'Show summary')

      expect(enricher.enrich_show('s1')).to eq(summary: 'Show summary')
    end
  end

  describe '#enrich_sections for shows' do
    let(:section) do
      {
        id: '12',
        updated_at: 4321,
        movies: [{ id: 's1', file_path: nil, title: 'Show 1' }]
      }
    end
    let(:detail) { { summary: 'Show details', season_count: 3 } }

    before do
      allow(cache_store).to receive(:enrich_version).and_return(8)
      allow(cache_store).to receive(:key).with('section', 'show', 'shows', '12', 4321, 'enriched', 8).and_return('show-section-cache-key')
      allow(cache_store).to receive(:fetch).with('show-section-cache-key').and_yield
      allow(show_concurrent_fetcher).to receive(:fetch).with(section[:movies]).and_return('s1' => detail)
    end

    it 'uses the show detail fetcher pipeline' do
      result_show = enricher.enrich_sections([section], media_type: 'show').first[:movies].first
      expect(result_show).to include(id: 's1', summary: 'Show details', season_count: 3)
    end

    it 'uses stream-aware detail pipeline for episode-like show rows' do
      episode_section = {
        id: '13',
        updated_at: 5331,
        movies: [{ id: 'e1', file_path: '/tv/show/s01e01.mkv', title: 'Pilot' }]
      }
      stream_detail = {
        subtitles_by_file: { '/tv/show/s01e01.mkv' => 'English (SRT)' },
        audio_by_file: { '/tv/show/s01e01.mkv' => 'English (AAC, 6ch, 640 kbps)' },
        audio_language_by_file: { '/tv/show/s01e01.mkv' => 'English' },
        audio_bitrate_by_file: { '/tv/show/s01e01.mkv' => 640 },
        video_bitrate_by_file: { '/tv/show/s01e01.mkv' => 3200 }
      }

      allow(cache_store).to receive(:key).with('section', 'show', 'shows', '13', 5331, 'enriched', 8).and_return('episode-section-cache-key')
      allow(cache_store).to receive(:fetch).with('episode-section-cache-key').and_yield
      allow(movie_concurrent_fetcher).to receive(:fetch).with(episode_section[:movies]).and_return('e1' => stream_detail)

      result_episode = enricher.enrich_sections([episode_section], media_type: 'show').first[:movies].first
      expect(result_episode).to include(
        subtitles: 'English (SRT)',
        audio_tracks: 'English (AAC, 6ch, 640 kbps)',
        audio_language: 'English',
        audio_bitrate: 640,
        video_bitrate: 3200
      )
    end
  end
end
