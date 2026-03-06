# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::ConcurrentDetailFetcher do
  subject(:fetcher) do
    described_class.new(cache_store: cache_store, detail_fetcher: detail_fetcher, thread_count: 2)
  end

  let(:cache_store) { instance_double(Plex::CacheStore) }
  let(:detail_fetcher) { instance_double(Plex::MovieDetailFetcher) }
  let(:items) do
    [
      { id: '1', updated_at: 10 },
      { id: '2', updated_at: 20 }
    ]
  end

  before do
    allow(cache_store).to receive(:enrich_version).and_return(5)
    allow(cache_store).to receive(:key) do |_a, _b, id, updated_at, version|
      "media/detail/#{id}/#{updated_at}/#{version}"
    end
    allow(cache_store).to receive(:fetch).and_yield
    allow(detail_fetcher).to receive(:fetch) { |id| { summary: "detail-#{id}" } }
  end

  it 'returns details keyed by item id' do
    expect(fetcher.fetch(items)).to eq('1' => { summary: 'detail-1' }, '2' => { summary: 'detail-2' })
  end

  it 'builds cache keys with media metadata and enrich version' do
    fetcher.fetch(items)
    expect(cache_store).to have_received(:key).with('media', 'detail', '1', 10, 5)
  end
end
