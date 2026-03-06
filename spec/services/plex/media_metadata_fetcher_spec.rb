# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::MediaMetadataFetcher do
  subject(:fetcher) { described_class.new(http_client) }

  let(:http_client) { instance_double(Plex::HttpClient) }

  it 'returns the first metadata item' do
    allow(http_client).to receive(:get).with('/library/metadata/10').and_return(
      'MediaContainer' => { 'Metadata' => [{ 'title' => 'Movie' }] }
    )

    expect(fetcher.fetch('10')).to eq('title' => 'Movie')
  end

  it 'returns an empty hash when the request fails' do
    allow(http_client).to receive(:get).and_raise(StandardError)

    expect(fetcher.fetch('10')).to eq({})
  end
end
