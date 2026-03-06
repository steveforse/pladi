# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::Enricher do
  subject(:enricher) { described_class.new(http_client, cache_store) }

  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:cache_store) { instance_double(Plex::CacheStore) }
  let(:support_doubles) do
    {
      metadata_fetcher: instance_double(Plex::MediaMetadataFetcher),
      movie_detail_fetcher: instance_double(Plex::MediaDetailFetcher),
      episode_detail_fetcher: instance_double(Plex::MediaDetailFetcher),
      show_detail_fetcher: instance_double(Plex::MediaDetailFetcher),
      movie_concurrent_fetcher: instance_double(Plex::ConcurrentDetailFetcher),
      episode_concurrent_fetcher: instance_double(Plex::ConcurrentDetailFetcher),
      show_concurrent_fetcher: instance_double(Plex::ConcurrentDetailFetcher),
      movie_parser: instance_double(Plex::MovieDetailParser),
      episode_parser: instance_double(Plex::EpisodeDetailParser),
      show_parser: instance_double(Plex::ShowDetailParser)
    }
  end

  before do
    allow(Plex::MediaMetadataFetcher).to receive(:new).with(http_client).and_return(metadata_fetcher)
    allow(Plex::MovieDetailParser).to receive(:new).and_return(movie_parser)
    allow(Plex::EpisodeDetailParser).to receive(:new).and_return(episode_parser)
    allow(Plex::ShowDetailParser).to receive(:new).and_return(show_parser)
    allow(Plex::MediaDetailFetcher).to receive(:new)
      .with(http_client, parser: movie_parser)
      .and_return(movie_detail_fetcher)
    allow(Plex::MediaDetailFetcher).to receive(:new)
      .with(http_client, parser: episode_parser)
      .and_return(episode_detail_fetcher)
    allow(Plex::MediaDetailFetcher).to receive(:new)
      .with(http_client, parser: show_parser)
      .and_return(show_detail_fetcher)
    allow(Plex::ConcurrentDetailFetcher).to receive(:new).with(
      cache_store: cache_store,
      detail_fetcher: movie_detail_fetcher,
      thread_count: described_class::ENRICH_THREADS
    ).and_return(movie_concurrent_fetcher)
    allow(Plex::ConcurrentDetailFetcher).to receive(:new).with(
      cache_store: cache_store,
      detail_fetcher: episode_detail_fetcher,
      thread_count: described_class::ENRICH_THREADS
    ).and_return(episode_concurrent_fetcher)
    allow(Plex::ConcurrentDetailFetcher).to receive(:new).with(
      cache_store: cache_store,
      detail_fetcher: show_detail_fetcher,
      thread_count: described_class::ENRICH_THREADS
    ).and_return(show_concurrent_fetcher)
  end

  describe '#enrich_detail' do
    subject(:result) { enricher.enrich_detail('123', media_type: media_type, file_path: file_path) }

    let(:file_path) { '/movies/a.mkv' }

    context 'with full stream detail maps' do
      let(:media_type) { 'movie' }

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
      let(:media_type) { 'movie' }

      before do
        allow(movie_detail_fetcher).to receive(:fetch).with('123').and_return(summary: 'Only summary')
      end

      it 'returns nil for subtitles' do
        expect(result[:subtitles]).to be_nil
      end
    end

    context 'when media type is show' do
      let(:media_type) { 'show' }
      let(:file_path) { nil }

      it 'returns parsed show detail without stream merging' do
        allow(show_detail_fetcher).to receive(:fetch).with('123').and_return(summary: 'Show summary')

        expect(result).to eq(summary: 'Show summary')
      end
    end
  end

  def metadata_fetcher = support_doubles[:metadata_fetcher]
  def movie_detail_fetcher = support_doubles[:movie_detail_fetcher]
  def episode_detail_fetcher = support_doubles[:episode_detail_fetcher]
  def show_detail_fetcher = support_doubles[:show_detail_fetcher]
  def movie_concurrent_fetcher = support_doubles[:movie_concurrent_fetcher]
  def episode_concurrent_fetcher = support_doubles[:episode_concurrent_fetcher]
  def show_concurrent_fetcher = support_doubles[:show_concurrent_fetcher]
  def movie_parser = support_doubles[:movie_parser]
  def episode_parser = support_doubles[:episode_parser]
  def show_parser = support_doubles[:show_parser]

  describe '#enrich_sections' do
    let(:section) do
      {
        id: '10',
        updated_at: 1234,
        items: [{ id: 'm1', media_type: 'movie', file_path: '/movies/m1.mkv', title: 'Movie 1' }]
      }
    end
    let(:detail) do
      {
        summary: 'Detailed summary',
        subtitles_by_file: { '/movies/m1.mkv' => 'Thai (SRT)' }
      }
    end
    let(:result_movie) { enricher.enrich_sections([section], scope: Plex::MediaScope.movies).first[:items].first }

    before do
      allow(cache_store).to receive(:enrich_version).and_return(7)
      allow(cache_store).to receive(:key).with('section', 'movie', 'shows', '10', 1234, 'enriched',
                                               7).and_return('section-cache-key')
      allow(cache_store).to receive(:fetch).with('section-cache-key').and_yield
      allow(movie_concurrent_fetcher).to receive(:fetch).with(section[:items]).and_return('m1' => detail)
    end

    it { expect(result_movie[:id]).to eq('m1') }
    it { expect(result_movie[:title]).to eq('Movie 1') }
    it { expect(result_movie[:summary]).to eq('Detailed summary') }
    it { expect(result_movie[:subtitles]).to eq('Thai (SRT)') }

    context 'when detail omits stream-derived values' do
      before do
        section_with_existing_bitrate = {
          id: '10',
          updated_at: 1234,
          items: [
            { id: 'm1', media_type: 'movie', file_path: '/movies/m1.mkv', title: 'Movie 1', video_bitrate: 2_400 }
          ]
        }
        allow(movie_concurrent_fetcher).to receive(:fetch)
          .with(section_with_existing_bitrate[:items])
          .and_return('m1' => { summary: 'Detailed summary' })
      end

      it 'preserves existing stream-derived values' do
        result = enricher.enrich_sections([section_with_existing_bitrate], scope: Plex::MediaScope.movies).first[:items].first
        expect(result[:video_bitrate]).to eq(2_400)
      end

      def section_with_existing_bitrate
        {
          id: '10',
          updated_at: 1234,
          items: [
            { id: 'm1', media_type: 'movie', file_path: '/movies/m1.mkv', title: 'Movie 1', video_bitrate: 2_400 }
          ]
        }
      end
    end

    context 'when a section contains mixed media types' do
      let(:section) do
        {
          id: '10',
          updated_at: 1234,
          items: [
            { id: 'm1', media_type: 'movie', file_path: '/movies/m1.mkv', title: 'Movie 1' },
            { id: 'e1', media_type: 'episode', file_path: '/tv/show/s01e01.mkv', title: 'Pilot' }
          ]
        }
      end

      it 'fails fast instead of silently treating the section as movies' do
        expect { enricher.enrich_sections([section], scope: Plex::MediaScope.movies) }
          .to raise_error(ArgumentError, 'Mixed media types in section: movie, episode')
      end
    end

    context 'when populated section rows are missing media_type' do
      let(:section) do
        {
          id: '10',
          updated_at: 1234,
          items: [{ id: 'm1', media_type: nil, file_path: '/movies/m1.mkv', title: 'Movie 1' }]
        }
      end

      it 'fails fast instead of defaulting to movies' do
        expect { enricher.enrich_sections([section], scope: Plex::MediaScope.movies) }
          .to raise_error(ArgumentError, 'Missing media_type in section items')
      end
    end

    context 'when a section has no items' do
      let(:section) { { id: '10', updated_at: 1234, items: [] } }

      before do
        allow(movie_concurrent_fetcher).to receive(:fetch).with([]).and_return({})
      end

      it 'treats the empty section as movie-shaped for fetch selection' do
        expect(enricher.enrich_sections([section], scope: Plex::MediaScope.movies)).to eq([section])
      end
    end
  end

  describe '#enrich_sections for shows' do
    let(:section) do
      {
        id: '12',
        updated_at: 4321,
        items: [{ id: 's1', media_type: 'show', file_path: nil, title: 'Show 1' }]
      }
    end
    let(:detail) { { summary: 'Show details', season_count: 3 } }

    before do
      allow(cache_store).to receive(:enrich_version).and_return(8)
      allow(cache_store).to receive(:key).with('section', 'show', 'shows', '12', 4321, 'enriched',
                                               8).and_return('show-section-cache-key')
      allow(cache_store).to receive(:fetch).with('show-section-cache-key').and_yield
      allow(show_concurrent_fetcher).to receive(:fetch).with(section[:items]).and_return('s1' => detail)
    end

    it 'uses the show detail fetcher pipeline' do
      result_show = enricher.enrich_sections([section], scope: Plex::MediaScope.shows('shows')).first[:items].first
      expect(result_show).to include(id: 's1', summary: 'Show details', season_count: 3)
    end

    context 'with episode-like show rows' do
      before do
        allow(cache_store).to receive(:key).with('section', 'show', 'shows', '13', 5331, 'enriched',
                                                 8).and_return('episode-section-cache-key')
        allow(cache_store).to receive(:fetch).with('episode-section-cache-key').and_yield
        allow(episode_concurrent_fetcher).to receive(:fetch)
          .with(episode_section[:items])
          .and_return('e1' => stream_detail)
      end

      it { expect(result_episode[:subtitles]).to eq('English (SRT)') }
      it { expect(result_episode[:audio_tracks]).to eq('English (AAC, 6ch, 640 kbps)') }
      it { expect(result_episode[:audio_language]).to eq('English') }
      it { expect(result_episode[:audio_bitrate]).to eq(640) }
      it { expect(result_episode[:video_bitrate]).to eq(3200) }

      def episode_section
        {
          id: '13',
          updated_at: 5331,
          items: [{ id: 'e1', media_type: 'episode', file_path: '/tv/show/s01e01.mkv', title: 'Pilot' }]
        }
      end

      def stream_detail
        {
          subtitles_by_file: { '/tv/show/s01e01.mkv' => 'English (SRT)' },
          audio_by_file: { '/tv/show/s01e01.mkv' => 'English (AAC, 6ch, 640 kbps)' },
          audio_language_by_file: { '/tv/show/s01e01.mkv' => 'English' },
          audio_bitrate_by_file: { '/tv/show/s01e01.mkv' => 640 },
          video_bitrate_by_file: { '/tv/show/s01e01.mkv' => 3200 }
        }
      end

      def result_episode
        enricher.enrich_sections([episode_section], scope: Plex::MediaScope.shows('shows')).first[:items].first
      end
    end
  end

  describe 'episode detail enrichment' do
    subject(:result) { enricher.enrich_detail('e1', media_type: 'episode', file_path: '/tv/show/s01e01.mkv') }

    before do
      allow(episode_detail_fetcher).to receive(:fetch).with('e1').and_return(
        summary: 'Pilot summary',
        subtitles_by_file: { '/tv/show/s01e01.mkv' => 'English (SRT)' }
      )
    end

    it { expect(result[:summary]).to eq('Pilot summary') }
    it { expect(result[:subtitles]).to eq('English (SRT)') }
  end

  describe '#metadata_for' do
    it 'uses the shared metadata fetcher' do
      allow(metadata_fetcher).to receive(:fetch).with('42').and_return('type' => 'movie')

      expect(enricher.metadata_for('42')).to eq('type' => 'movie')
    end
  end
end
