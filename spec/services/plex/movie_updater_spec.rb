# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::MovieUpdater do
  subject(:updater) { described_class.new(http_client, cache_store) }

  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:cache_store) { instance_double(Plex::CacheStore) }

  describe '#fetch_movie_snapshot' do
    let(:payload) do
      {
        'MediaContainer' => {
          'Metadata' => [
            {
              'librarySectionID' => 1,
              'librarySectionTitle' => 'Movies',
              'title' => 'Example',
              'summary' => 'Summary text',
              'titleSort' => 'Example, The',
              'Genre' => [{ 'tag' => 'Sci-Fi' }, { 'tag' => '' }, { 'tag' => 'Drama' }],
              'Label' => [{ 'tag' => '4K' }]
            }
          ]
        }
      }
    end
    let(:snapshot) { updater.fetch_movie_snapshot('42') }

    before do
      allow(http_client).to receive(:get).with('/library/metadata/42').and_return(payload)
    end

    it 'returns section id' do
      expect(snapshot[:section_id]).to eq('1')
    end

    it 'returns section title' do
      expect(snapshot[:section_title]).to eq('Movies')
    end

    it 'returns movie title' do
      expect(snapshot[:movie_title]).to eq('Example')
    end

    it 'maps scalar field names' do
      expect(snapshot['sort_title']).to eq('Example, The')
    end

    it 'normalizes and sorts tag fields' do
      expect(snapshot['genres']).to eq(%w[Drama Sci-Fi])
    end

    it 'keeps label tags' do
      expect(snapshot['labels']).to eq(['4K'])
    end
  end

  describe '#update_movie' do
    let(:fields) do
      {
        title: 'New Title',
        summary: 'New summary',
        genres: ['Drama', 'Sci Fi'],
        labels: []
      }
    end
    let(:before_payload) do
      {
        'MediaContainer' => {
          'Metadata' => [
            {
              'librarySectionID' => 1,
              'librarySectionTitle' => 'Movies',
              'title' => 'Old Title',
              'summary' => 'Old summary',
              'Genre' => [{ 'tag' => 'Drama' }],
              'Label' => [{ 'tag' => 'Old' }]
            }
          ]
        }
      }
    end
    let(:after_payload) do
      {
        'MediaContainer' => {
          'Metadata' => [
            {
              'librarySectionID' => 1,
              'librarySectionTitle' => 'Movies',
              'title' => 'New Title',
              'summary' => 'Not applied',
              'Genre' => [{ 'tag' => 'Drama' }],
              'Label' => []
            }
          ]
        }
      }
    end
    let(:result) { updater.update_movie('42', fields) }

    before do
      allow(http_client).to receive(:get).with('/library/metadata/42').and_return(before_payload, after_payload)
      allow(http_client).to receive(:put)
      allow(cache_store).to receive(:bump_enrich_version)
      result
    end

    it 'sends scalar and tag update query parts with locks' do
      expect(http_client).to have_received(:put).with(
        a_string_including('/library/metadata/42?', 'type=1', 'title.value=New+Title', 'title.locked=1',
                           'summary.value=New+summary', 'summary.locked=1', 'genre[0].tag.tag=Drama',
                           'genre[1].tag.tag=Sci+Fi', 'genre.locked=1', 'label[0].tag.tag=', 'label.locked=1')
      )
    end

    it 'bumps enrich cache version' do
      expect(cache_store).to have_received(:bump_enrich_version).once
    end

    it 'returns the before snapshot' do
      expect(result[:before]['title']).to eq('Old Title')
    end

    it 'returns the after snapshot' do
      expect(result[:after]['title']).to eq('New Title')
    end

    it 'returns fields that did not verify' do
      expect(result[:unverified_fields]).to contain_exactly('summary', 'genres')
    end
  end

  describe '#update_movie with unknown fields' do
    let(:payload) do
      {
        'MediaContainer' => {
          'Metadata' => [
            {
              'librarySectionID' => 1,
              'librarySectionTitle' => 'Movies',
              'title' => 'Same'
            }
          ]
        }
      }
    end

    before do
      allow(http_client).to receive(:get).with('/library/metadata/9').and_return(payload, payload)
      allow(http_client).to receive(:put)
      allow(cache_store).to receive(:bump_enrich_version)
    end

    it 'does not include unknown field in query' do
      updater.update_movie('9', unknown: 'value')
      expect(http_client).to have_received(:put).with('/library/metadata/9?type=1')
    end

    it 'does not mark unknown field as unverified' do
      result = updater.update_movie('9', unknown: 'value')
      expect(result[:unverified_fields]).to eq([])
    end
  end
end
