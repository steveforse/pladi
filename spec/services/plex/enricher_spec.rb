# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::Enricher do
  subject(:enricher) { described_class.new(http_client, cache_store) }

  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:cache_store) { instance_double(Plex::CacheStore) }
  let(:detail_fetcher) { instance_double(Plex::MovieDetailFetcher) }
  let(:concurrent_fetcher) { instance_double(Plex::ConcurrentDetailFetcher) }

  before do
    allow(Plex::MovieDetailFetcher).to receive(:new).with(http_client).and_return(detail_fetcher)
    allow(Plex::ConcurrentDetailFetcher).to receive(:new).with(
      cache_store: cache_store,
      detail_fetcher: detail_fetcher,
      thread_count: described_class::ENRICH_THREADS
    ).and_return(concurrent_fetcher)
  end

  describe '#enrich_movie' do
    subject(:result) { enricher.enrich_movie('123', '/movies/a.mkv') }

    context 'with full stream detail maps' do
      before do
        allow(detail_fetcher).to receive(:fetch).with('123').and_return(
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
        allow(detail_fetcher).to receive(:fetch).with('123').and_return(summary: 'Only summary')
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
      allow(cache_store).to receive(:key).with('section', '10', 1234, 'enriched', 7).and_return('section-cache-key')
      allow(cache_store).to receive(:fetch).with('section-cache-key').and_yield
      allow(concurrent_fetcher).to receive(:fetch).with(section[:movies]).and_return('m1' => detail)
    end

    it { expect(result_movie[:id]).to eq('m1') }
    it { expect(result_movie[:title]).to eq('Movie 1') }
    it { expect(result_movie[:summary]).to eq('Detailed summary') }
    it { expect(result_movie[:subtitles]).to eq('Thai (SRT)') }
  end
end
