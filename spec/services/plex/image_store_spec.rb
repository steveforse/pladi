# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::ImageStore do
  subject(:store) { described_class.new(http_client, cache_store) }

  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:cache_store) { instance_double(Plex::CacheStore) }

  describe '#poster_for' do
    let(:image_data) { { data: 'poster-bytes', content_type: 'image/jpeg' } }

    context 'when fetch succeeds' do
      before do
        allow(cache_store).to receive(:key).with('poster', '10').and_return('poster-key')
        allow(cache_store).to receive(:fetch).with('poster-key', skip_nil: true).and_yield
        allow(http_client).to receive(:get_image).with('/library/metadata/10/thumb').and_return(image_data)
      end

      it 'returns poster image data' do
        expect(store.poster_for('10')).to eq(image_data)
      end
    end

    context 'when fetch errors' do
      before do
        allow(cache_store).to receive(:key).with('poster', '10').and_return('poster-key')
        allow(cache_store).to receive(:fetch).with('poster-key', skip_nil: true).and_raise(StandardError)
      end

      it 'returns nil' do
        expect(store.poster_for('10')).to be_nil
      end
    end
  end

  describe '#background_for' do
    context 'when fetch succeeds' do
      let(:image_data) { { data: 'bg-bytes', content_type: 'image/png' } }

      before do
        allow(cache_store).to receive(:key).with('background', '10').and_return('background-key')
        allow(cache_store).to receive(:fetch).with('background-key', skip_nil: true).and_yield
        allow(http_client).to receive(:get_image).with('/library/metadata/10/art').and_return(image_data)
      end

      it 'returns background image data' do
        expect(store.background_for('10')).to eq(image_data)
      end
    end

    context 'when image fetch errors' do
      before do
        allow(cache_store).to receive(:key).with('background', '10').and_return('background-key')
        allow(cache_store).to receive(:fetch).with('background-key', skip_nil: true).and_raise(StandardError)
      end

      it 'returns nil' do
        expect(store.background_for('10')).to be_nil
      end
    end
  end

  describe '#partition_posters_by_cache' do
    let(:sections) do
      [
        { items: [{ id: '1', thumb: '/thumb-1' }, { id: '2', thumb: '/thumb-2' }] },
        { items: [{ id: '2', thumb: '/thumb-2' }, { id: '3' }] }
      ]
    end

    before do
      allow(cache_store).to receive(:cached_poster_media_ids).with(%w[1 2]).and_return(['2'])
    end

    it 'returns cached and uncached posters by movie id' do
      expect(store.partition_posters_by_cache(sections)).to eq(
        [[{ id: '2', thumb: '/thumb-2' }], [{ id: '1', thumb: '/thumb-1' }]]
      )
    end
  end

  describe '#partition_backgrounds_by_cache' do
    let(:sections) do
      [
        { items: [{ id: '1', art: '/art-1' }, { id: '2', art: '/art-2' }] },
        { items: [{ id: '2', art: '/art-2' }, { id: '3' }] }
      ]
    end

    before do
      allow(cache_store).to receive(:cached_background_media_ids).with(%w[1 2]).and_return(['1'])
    end

    it 'returns cached and uncached backgrounds by movie id' do
      expect(store.partition_backgrounds_by_cache(sections)).to eq(
        [[{ id: '1', art: '/art-1' }], [{ id: '2', art: '/art-2' }]]
      )
    end
  end
end
