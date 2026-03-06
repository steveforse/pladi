# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::EpisodeDetailFetcher do
  subject(:fetcher) { described_class.new(http_client, parser: parser) }

  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:parser) { instance_double(Plex::EpisodeDetailParser) }

  describe '#fetch' do
    let(:item) { { 'title' => 'Episode' } }

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
  end
end
