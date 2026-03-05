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
  let(:movie_updater) { instance_double(Plex::MovieUpdater) }

  before do
    allow(Plex::HttpClient).to receive(:new).with(server_record).and_return(http_client)
    allow(Plex::CacheStore).to receive(:new).with(9).and_return(cache_store)
    allow(Plex::LibraryFetcher).to receive(:new).with(http_client, cache_store).and_return(library_fetcher)
    allow(Plex::Enricher).to receive(:new).with(http_client, cache_store).and_return(enricher)
    allow(Plex::ImageStore).to receive(:new).with(http_client, cache_store).and_return(image_store)
    allow(Plex::MovieUpdater).to receive(:new).with(http_client, cache_store).and_return(movie_updater)
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
      allow(library_fetcher).to receive(:fetch_sections).with(media_type: 'movie', view_mode: 'shows').and_return([{ title: 'Fresh' }])
      allow(library_fetcher).to receive(:fetch_sections).with(media_type: 'show', view_mode: 'shows').and_return([{ title: 'TV Shows' }])
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
      expect(plex_server_service.sections(media_type: 'show')).to eq([{ title: 'TV Shows' }])
    end
  end

  describe '#detail_for' do
    let(:sections) { [{ movies: [{ id: '7', file_path: '/movies/7.mkv' }] }] }

    before do
      allow(cache_store).to receive(:key).with('sections', 'movie', 'shows').and_return('sections-key')
      allow(cache_store).to receive(:fetch).with('sections-key').and_return(sections)
      allow(enricher).to receive(:enrich_movie).with('7', '/movies/7.mkv').and_return(summary: 'enriched')
    end

    it 'returns nil when movie is not found' do
      expect(plex_server_service.detail_for('9')).to be_nil
    end

    it 'enriches and returns the movie detail' do
      expect(plex_server_service.detail_for('7')).to eq(summary: 'enriched')
    end

    it 'enriches and returns show detail via show path' do
      allow(cache_store).to receive(:key).with('sections', 'show', 'shows').and_return('show-sections-key')
      allow(cache_store).to receive(:fetch).with('show-sections-key').and_return([{ movies: [{ id: '7', file_path: nil }] }])
      allow(enricher).to receive(:enrich_show).with('7').and_return(summary: 'show enriched')

      expect(plex_server_service.detail_for('7', media_type: 'show')).to eq(summary: 'show enriched')
    end
  end

  describe '#enriched_library' do
    let(:sections) { [{ movies: [{ id: '1' }, { id: '2' }] }] }

    before do
      allow(cache_store).to receive(:key).with('sections', 'movie', 'shows').and_return('sections-key')
      allow(cache_store).to receive(:fetch).with('sections-key').and_return(sections)
      allow(enricher).to receive(:enrich_sections).with(sections, media_type: 'movie', view_mode: 'shows').and_return(sections)
      allow(image_store).to receive(:partition_posters_by_cache).with(sections).and_return(
        [[{ id: '1' }], [{ id: '2' }]]
      )
      allow(image_store).to receive(:partition_backgrounds_by_cache).with(sections).and_return(
        [[{ id: '2' }], [{ id: '1' }]]
      )
    end

    it 'returns cached poster ids' do
      expect(plex_server_service.enriched_library[:cached_poster_ids]).to eq(['1'])
    end

    it 'returns uncached poster movies' do
      expect(plex_server_service.enriched_library[:uncached_poster_movies]).to eq([{ id: '2' }])
    end

    it 'returns cached background ids' do
      expect(plex_server_service.enriched_library[:cached_background_ids]).to eq(['2'])
    end

    it 'returns uncached background movies' do
      expect(plex_server_service.enriched_library[:uncached_background_movies]).to eq([{ id: '1' }])
    end
  end

  describe 'delegated methods' do
    it 'delegates update_movie' do
      allow(movie_updater).to receive(:update_movie).with('10', title: 'New')
      plex_server_service.update_movie('10', title: 'New')
      expect(movie_updater).to have_received(:update_movie).with('10', title: 'New')
    end

    it 'delegates poster_for' do
      allow(image_store).to receive(:poster_for).with('10').and_return(data: 'img')
      expect(plex_server_service.poster_for('10')).to eq(data: 'img')
    end

    it 'delegates update_show' do
      allow(movie_updater).to receive(:update_show).with('10', title: 'New Show')
      plex_server_service.update_show('10', title: 'New Show')
      expect(movie_updater).to have_received(:update_show).with('10', title: 'New Show')
    end

    it 'delegates background_for' do
      allow(image_store).to receive(:background_for).with('10').and_return(data: 'img')
      expect(plex_server_service.background_for('10')).to eq(data: 'img')
    end
  end
end
