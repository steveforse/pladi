# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::Server do
  subject(:plex_server_service) { described_class.new(server_record) }

  let(:server_record) { instance_double(PlexServer, id: 9) }
  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:cache_store) { instance_double(Plex::CacheStore) }
  let(:library_fetcher) { instance_double(Plex::LibraryFetcher) }
  let(:enricher) { instance_double(Plex::Enricher) }
  let(:image_store) { instance_double(Plex::ImageStore) }
  let(:media_updater) { instance_double(Plex::MediaUpdater) }
  let(:movie_scope) { Plex::MediaScope.movies }
  let(:shows_scope) { Plex::MediaScope.shows('shows') }

  before do
    allow(Plex::HttpClient).to receive(:new).with(server_record).and_return(http_client)
    allow(Plex::CacheStore).to receive(:new).with(9).and_return(cache_store)
    allow(Plex::LibraryFetcher).to receive(:new).with(http_client, cache_store).and_return(library_fetcher)
    allow(Plex::Enricher).to receive(:new).with(http_client, cache_store).and_return(enricher)
    allow(Plex::ImageStore).to receive(:new).with(http_client, cache_store).and_return(image_store)
    allow(Plex::MediaUpdater).to receive(:new).with(http_client, cache_store).and_return(media_updater)
  end

  describe '#friendly_name' do
    before do
      allow(http_client).to receive(:get).with('/').and_return('MediaContainer' => { 'friendlyName' => 'My Plex' })
    end

    it 'returns server friendly name' do
      expect(plex_server_service.friendly_name).to eq('My Plex')
    end
  end

  describe '#sections' do
    before do
      allow(cache_store).to receive(:key).with('sections', 'movie', 'shows').and_return('sections-key')
      allow(cache_store).to receive(:fetch).with('sections-key').and_return([{ title: 'Movies' }])
      allow(library_fetcher).to receive(:fetch_sections).with(scope: movie_scope).and_return([{ title: 'Fresh' }])
      allow(library_fetcher).to receive(:fetch_sections).with(scope: shows_scope).and_return([{ title: 'TV Shows' }])
      allow(cache_store).to receive(:key).with('sections', 'show', 'shows').and_return('shows-sections-key')
      allow(cache_store).to receive(:fetch).with('shows-sections-key').and_return([{ title: 'TV Shows' }])
      allow(cache_store).to receive(:write)
    end

    it 'uses cache by default' do
      expect(plex_server_service.sections).to eq([{ title: 'Movies' }])
    end

    it 'refreshes from library when refresh is true' do
      expect(plex_server_service.sections(refresh: true)).to eq([{ title: 'Fresh' }])
    end

    it 'writes refreshed sections to cache' do
      plex_server_service.sections(refresh: true)
      expect(cache_store).to have_received(:write).with('sections-key', [{ title: 'Fresh' }])
    end

    it 'uses distinct cache keys for show sections' do
      expect(plex_server_service.sections(scope: shows_scope)).to eq([{ title: 'TV Shows' }])
    end

    it 'fetches from the library on cache miss' do
      allow(cache_store).to receive(:fetch).with('sections-key').and_yield

      expect(plex_server_service.sections).to eq([{ title: 'Fresh' }])
    end
  end

  describe '#detail_for' do
    let(:sections) { [{ items: [{ id: '7', media_type: 'movie', file_path: '/movies/7.mkv' }] }] }

    before do
      allow(cache_store).to receive(:key).with('sections', 'movie', 'shows').and_return('sections-key')
      allow(cache_store).to receive(:fetch).with('sections-key').and_return(sections)
      allow(enricher).to receive(:enrich_detail)
        .with('7', media_type: 'movie', file_path: '/movies/7.mkv')
        .and_return(summary: 'enriched')
    end

    it 'returns nil when movie is not found' do
      allow(enricher).to receive(:metadata_for).with('9').and_return({})
      expect(plex_server_service.detail_for('9')).to be_nil
    end

    it 'enriches and returns the movie detail' do
      expect(plex_server_service.detail_for('7')).to eq(summary: 'enriched')
    end

    context 'when multipart rows share the same media id' do
      before do
        allow(cache_store).to receive(:fetch).with('sections-key').and_return(
          [
            {
              items: [
                { id: '7', media_type: 'movie', file_path: '/movies/7-a.mkv' },
                { id: '7', media_type: 'movie', file_path: '/movies/7-b.mkv' }
              ]
            }
          ]
        )
        allow(enricher).to receive(:enrich_detail)
          .with('7', media_type: 'movie', file_path: '/movies/7-b.mkv')
          .and_return(summary: 'part b')
      end

      it 'uses file_path to disambiguate multipart media rows' do
        expect(plex_server_service.detail_for('7', file_path: '/movies/7-b.mkv')).to eq(summary: 'part b')
      end

      it 'returns nil when a cached multipart row is requested without file_path' do
        expect(plex_server_service.detail_for('7')).to be_nil
      end
    end

    context 'when the cached section row is a show' do
      before do
        allow(cache_store).to receive(:key).with('sections', 'show', 'shows').and_return('show-sections-key')
        allow(cache_store).to receive(:fetch).with('show-sections-key')
          .and_return([{ items: [{ id: '7', media_type: 'show', file_path: nil }] }])
        allow(enricher).to receive(:enrich_detail)
          .with('7', media_type: 'show', file_path: nil)
          .and_return(summary: 'show enriched')
      end

      it 'enriches and returns show detail via show path' do
        expect(plex_server_service.detail_for('7', scope: shows_scope)).to eq(summary: 'show enriched')
      end
    end

    context 'when the cached section row is an episode' do
      before do
        allow(cache_store).to receive(:key).with('sections', 'show', 'episodes').and_return('episode-sections-key')
        allow(cache_store).to receive(:fetch).with('episode-sections-key')
          .and_return([{ items: [{ id: '7', media_type: 'episode', file_path: '/tv/show/s01e01.mkv' }] }])
        allow(enricher).to receive(:enrich_detail)
          .with('7', media_type: 'episode', file_path: '/tv/show/s01e01.mkv')
          .and_return(summary: 'episode enriched')
      end

      it 'enriches and returns episode detail via episode path' do
        expect(plex_server_service.detail_for('7', scope: Plex::MediaScope.shows('episodes')))
          .to eq(summary: 'episode enriched')
      end
    end

    context 'when the cached section list misses the item' do
      before do
        allow(cache_store).to receive(:fetch).with('sections-key').and_return([{ items: [] }])
        allow(enricher).to receive(:metadata_for).with('7').and_return(direct_movie_metadata)
      end

      it { expect(plex_server_service.detail_for('7')).to eq(summary: 'enriched') }

      it 'returns nil when the requested file_path is not present on the direct metadata item' do
        expect(plex_server_service.detail_for('7', file_path: '/movies/missing.mkv')).to be_nil
      end

      context 'when the direct metadata is multipart and no row identity was supplied' do
        before do
          allow(enricher).to receive(:metadata_for).with('7').and_return(
            direct_movie_metadata.merge(
              'Media' => [{ 'Part' => [{ 'file' => '/movies/7-a.mkv' }, { 'file' => '/movies/7-b.mkv' }] }]
            )
          )
        end

        it 'returns nil instead of guessing the first part' do
          expect(plex_server_service.detail_for('7')).to be_nil
        end
      end

      context 'when the direct metadata belongs to another library type' do
        before do
          allow(cache_store).to receive(:key).with('sections', 'show', 'shows').and_return('show-sections-key')
          allow(cache_store).to receive(:fetch).with('show-sections-key').and_return([{ items: [] }])
          allow(enricher).to receive(:metadata_for).with('7').and_return(
            direct_movie_metadata.merge('type' => 'movie')
          )
        end

        it 'returns nil for the show scope' do
          expect(plex_server_service.detail_for('7', scope: shows_scope)).to be_nil
        end
      end

      context 'when show metadata is fetched directly for show scope' do
        before do
          allow(cache_store).to receive(:key).with('sections', 'show', 'shows').and_return('show-sections-key')
          allow(cache_store).to receive(:fetch).with('show-sections-key').and_return([{ items: [] }])
          allow(enricher).to receive(:metadata_for).with('7').and_return(
            'ratingKey' => '7',
            'type' => 'show'
          )
          allow(enricher).to receive(:enrich_detail)
            .with('7', media_type: 'show', file_path: nil)
            .and_return(summary: 'direct show')
        end

        it 'returns the direct show detail' do
          expect(plex_server_service.detail_for('7', scope: shows_scope)).to eq(summary: 'direct show')
        end
      end

      context 'when the direct metadata is a show for episode scope' do
        before do
          allow(cache_store).to receive(:key).with('sections', 'show', 'episodes').and_return('episode-sections-key')
          allow(cache_store).to receive(:fetch).with('episode-sections-key').and_return([{ items: [] }])
          allow(enricher).to receive(:metadata_for).with('7').and_return(
            direct_movie_metadata.merge('type' => 'show')
          )
        end

        it 'returns nil for the episode scope' do
          expect(plex_server_service.detail_for('7', scope: Plex::MediaScope.shows('episodes'))).to be_nil
        end
      end

      def direct_movie_metadata
        {
          'ratingKey' => '7',
          'type' => 'movie',
          'Media' => [{ 'Part' => [{ 'file' => '/movies/7.mkv' }] }]
        }
      end
    end
  end

  describe '#enriched_library' do
    let(:sections) { [{ items: [{ id: '1' }, { id: '2' }] }] }

    before do
      allow(cache_store).to receive(:key).with('sections', 'movie', 'shows').and_return('sections-key')
      allow(cache_store).to receive(:fetch).with('sections-key').and_return(sections)
      allow(enricher).to receive(:progressive_enriched_sections).with(sections, scope: movie_scope).and_return(
        { sections: sections, pending_section_ids: [] }
      )
      allow(image_store).to receive(:partition_posters_by_cache).with(sections).and_return(
        [[{ id: '1' }], [{ id: '2' }]]
      )
      allow(image_store).to receive(:partition_backgrounds_by_cache).with(sections).and_return(
        [[{ id: '2' }], [{ id: '1' }]]
      )
    end

    it 'returns cached poster ids' do
      expect(plex_server_service.enriched_library[:cached_poster_media_ids]).to eq(['1'])
    end

    it 'returns uncached poster items' do
      expect(plex_server_service.enriched_library[:uncached_poster_items]).to eq([{ id: '2' }])
    end

    it 'returns cached background ids' do
      expect(plex_server_service.enriched_library[:cached_background_media_ids]).to eq(['2'])
    end

    it 'returns uncached background items' do
      expect(plex_server_service.enriched_library[:uncached_background_items]).to eq([{ id: '1' }])
    end

    # rubocop:disable RSpec/ExampleLength, RSpec/MultipleExpectations
    it 'schedules warm enrichment for pending sections' do
      allow(enricher).to receive(:progressive_enriched_sections).with(sections, scope: movie_scope).and_return(
        { sections: sections, pending_section_ids: ['2'] }
      )
      allow(WarmLibraryEnrichmentJob).to receive(:perform_later)

      expect(plex_server_service.enriched_library[:pending_section_ids]).to eq(['2'])
      expect(WarmLibraryEnrichmentJob).to have_received(:perform_later).with(9, movie_scope.to_h, ['2'])
    end
    # rubocop:enable RSpec/ExampleLength, RSpec/MultipleExpectations

    # rubocop:disable RSpec/ExampleLength
    it 'omits image cache payload for shows' do
      allow(cache_store).to receive(:key).with('sections', 'show', 'shows').and_return('show-sections-key')
      allow(cache_store).to receive(:fetch).with('show-sections-key').and_return(sections)
      allow(enricher).to receive(:progressive_enriched_sections)
        .with(sections, scope: shows_scope)
        .and_return({ sections:, pending_section_ids: [] })

      expect(plex_server_service.enriched_library(scope: shows_scope)).to eq(sections:, pending_section_ids: [])
    end
    # rubocop:enable RSpec/ExampleLength
  end

  describe '#stream_enrich_section' do
    let(:section) do
      {
        id: '10',
        updated_at: 1234,
        items: [
          { id: '1', title: 'First' },
          { id: '2', title: 'Second' }
        ]
      }
    end

    before do
      allow(cache_store).to receive(:enrich_version).and_return(7)
      allow(cache_store).to receive(:key)
        .with('section', 'movie', 'shows', '10', 1234, 'enriched', 7)
        .and_return('enriched-key')
      allow(cache_store).to receive(:write)
      allow(enricher).to receive(:enrich_items).with([{ id: '1', title: 'First' }])
        .and_return([{ id: '1', summary: 'A' }])
      allow(enricher).to receive(:enrich_items).with([{ id: '2', title: 'Second' }])
        .and_return([{ id: '2', summary: 'B' }])
    end

    # rubocop:disable RSpec/ExampleLength, RSpec/MultipleExpectations
    it 'enriches batches, yields them, and writes the merged section to cache' do
      yielded_batches = []

      result = plex_server_service.stream_enrich_section(section, batch_size: 1) do |batch|
        yielded_batches << batch
      end

      expect(yielded_batches).to eq([[{ id: '1', summary: 'A' }], [{ id: '2', summary: 'B' }]])
      expect(result).to eq(section.merge(items: [{ id: '1', summary: 'A' }, { id: '2', summary: 'B' }]))
      expect(cache_store).to have_received(:write).with('enriched-key', result)
    end
    # rubocop:enable RSpec/ExampleLength, RSpec/MultipleExpectations

    it 'enriches and caches the section even when no block is given' do
      allow(enricher).to receive(:enrich_items).with(section[:items]).and_return(
        [{ id: '1', summary: 'A' }, { id: '2', summary: 'B' }]
      )

      result = plex_server_service.stream_enrich_section(section, batch_size: 2)

      expect(result).to eq(section.merge(items: [{ id: '1', summary: 'A' }, { id: '2', summary: 'B' }]))
    end
  end

  describe '#enrich_section' do
    it 'delegates section enrichment to the enricher' do
      section = { id: '10', items: [] }
      allow(enricher).to receive(:enrich_section).with(section, scope: movie_scope).and_return(section)

      expect(plex_server_service.enrich_section(section, scope: movie_scope)).to eq(section)
    end
  end

  describe 'delegated methods' do
    it 'delegates movie updates through a shared entrypoint' do
      allow(media_updater).to receive(:update).with('10', { title: 'New' }, media_type: 'movie', file_path: nil)
      plex_server_service.update_media('10', { title: 'New' }, scope: movie_scope)
      expect(media_updater).to have_received(:update).with('10', { title: 'New' }, media_type: 'movie', file_path: nil)
    end

    it 'delegates poster_for' do
      allow(image_store).to receive(:poster_for).with('10').and_return(data: 'img')
      expect(plex_server_service.poster_for('10')).to eq(data: 'img')
    end

    it 'delegates episode updates through a shared entrypoint' do
      episode_scope = Plex::MediaScope.shows('episodes')
      episode_update_args = { media_type: 'episode', file_path: nil }
      allow(media_updater).to receive(:update).with('10', { title: 'New Episode' }, episode_update_args)
      plex_server_service.update_media('10', { title: 'New Episode' }, scope: episode_scope)
      expect(media_updater).to have_received(:update).with('10', { title: 'New Episode' }, episode_update_args)
    end

    it 'delegates background_for' do
      allow(image_store).to receive(:background_for).with('10').and_return(data: 'img')
      expect(plex_server_service.background_for('10')).to eq(data: 'img')
    end
  end
end
