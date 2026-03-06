# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::ShowDetailFetcher do
  subject(:fetcher) { described_class.new(http_client, parser: parser) }

  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:parser) { instance_double(Plex::ShowDetailParser) }

  describe '#fetch' do
    let(:item) { { 'title' => 'Show' } }

    before do
      allow(http_client).to receive(:get).with('/library/metadata/10').and_return(
        'MediaContainer' => { 'Metadata' => [item] }
      )
      allow(parser).to receive(:parse).with(item).and_return(summary: 'parsed')
    end

    it 'parses the first metadata item' do
      expect(fetcher.fetch('10')).to eq(summary: 'parsed')
    end

    it 'returns empty hash when request fails' do
      allow(http_client).to receive(:get).and_raise(StandardError)
      expect(fetcher.fetch('10')).to eq({})
    end

    it 'returns empty hash when parser fails' do
      allow(parser).to receive(:parse).and_raise(StandardError)
      expect(fetcher.fetch('10')).to eq({})
    end
  end

  describe '#metadata_for' do
    it 'returns the first metadata item' do
      allow(http_client).to receive(:get).with('/library/metadata/10').and_return(
        'MediaContainer' => { 'Metadata' => [{ 'title' => 'Show' }] }
      )

      expect(fetcher.metadata_for('10')).to eq('title' => 'Show')
    end
  end
end
