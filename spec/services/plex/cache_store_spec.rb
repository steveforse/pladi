# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::CacheStore do
  subject(:cache_store) { described_class.new(10) }

  describe '#key' do
    it 'builds a namespaced cache key' do
      expect(cache_store.key('section', '1')).to eq('plex/server/10/section/1')
    end
  end

  describe '#enrich_version' do
    it 'returns zero when cache is empty' do
      allow(Rails.cache).to receive(:read).and_return(nil)
      expect(cache_store.enrich_version).to eq(0)
    end

    it 'returns existing cache value' do
      allow(Rails.cache).to receive(:read).and_return(3)
      expect(cache_store.enrich_version).to eq(3)
    end
  end

  describe '#bump_enrich_version' do
    before do
      allow(Rails.cache).to receive(:read).and_return(2)
      allow(Rails.cache).to receive(:write)
      cache_store.bump_enrich_version
    end

    it 'writes incremented version back to cache' do
      expect(Rails.cache).to have_received(:write).with('plex/server/10/enrich_version', 3,
                                                        expires_in: Plex::CacheStore::CACHE_TTL)
    end
  end

  describe '#cached_movies_for' do
    before do
      allow(Rails.cache).to receive(:read).and_return(1)
      allow(Rails.cache).to receive(:fetch).and_yield
    end

    it 'uses section key with enrich version' do
      cache_store.cached_movies_for('2', 100) { [] }
      expect(Rails.cache).to have_received(:fetch).with('plex/server/10/section/2/100/1', expires_in: Plex::CacheStore::CACHE_TTL)
    end
  end

  describe '#posters_cached' do
    before do
      allow(Rails.cache).to receive(:read_multi).and_return('plex/server/10/poster/2' => 'hit')
    end

    it 'returns only ids with cached posters' do
      expect(cache_store.posters_cached(%w[1 2 3])).to eq(Set.new(['2']))
    end
  end

  describe '#backgrounds_cached' do
    before do
      allow(Rails.cache).to receive(:read_multi).and_return('plex/server/10/background/1' => 'hit')
    end

    it 'returns only ids with cached backgrounds' do
      expect(cache_store.backgrounds_cached(%w[1 2 3])).to eq(Set.new(['1']))
    end
  end
end
