# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::MediaUpdater do
  subject(:updater) { described_class.new(http_client, cache_store) }

  let(:http_client) { instance_double(Plex::HttpClient) }
  let(:cache_store) { instance_double(Plex::CacheStore) }

  describe '#snapshot_for' do
    subject(:snapshot) { updater.snapshot_for('42') }

    before do
      allow(http_client).to receive(:get).with('/library/metadata/42').and_return(
        'MediaContainer' => {
          'Metadata' => [
            {
              'librarySectionID' => 1,
              'librarySectionTitle' => 'Movies',
              'title' => 'Example',
              'summary' => 'Plot',
              'Genre' => [{ 'tag' => 'Drama' }, { 'tag' => 'Sci-Fi' }]
            }
          ]
        }
      )
    end

    it { expect(snapshot[:section_id]).to eq('1') }
    it { expect(snapshot[:section_title]).to eq('Movies') }
    it { expect(snapshot[:media_title]).to eq('Example') }
    it { expect(snapshot['summary']).to eq('Plot') }
    it { expect(snapshot['genres']).to eq(%w[Drama Sci-Fi]) }

    context 'when multipart metadata is ambiguous' do
      before do
        allow(http_client).to receive(:get).with('/library/metadata/42').and_return(
          'MediaContainer' => {
            'Metadata' => [
              {
                'librarySectionID' => 1,
                'librarySectionTitle' => 'Movies',
                'title' => 'Example',
                'Media' => [{ 'Part' => [{ 'file' => '/movies/a.mkv' }, { 'file' => '/movies/b.mkv' }] }]
              }
            ]
          }
        )
      end

      it 'does not guess a file_path when no row identity was provided' do
        expect(snapshot[:file_path]).to be_nil
      end

      it 'keeps the requested file_path when it matches a Plex part' do
        expect(updater.snapshot_for('42', file_path: '/movies/b.mkv')[:file_path]).to eq('/movies/b.mkv')
      end
    end
  end

  describe '#update' do
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
              'Genre' => [{ 'tag' => 'Drama' }, { 'tag' => 'Sci-Fi' }],
              'Label' => [{ 'tag' => 'Keep' }]
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
    let(:result) { updater.update('42', fields, media_type: 'movie') }

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

  describe '#update with unknown fields' do
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
      updater.update('9', { unknown: 'value' }, media_type: 'movie')
      expect(http_client).to have_received(:put).with('/library/metadata/9?type=1')
    end

    it 'does not mark unknown field as unverified' do
      result = updater.update('9', { unknown: 'value' }, media_type: 'movie')
      expect(result[:unverified_fields]).to eq([])
    end
  end

  describe '#update for shows' do
    let(:before_payload) do
      {
        'MediaContainer' => {
          'Metadata' => [
            {
              'librarySectionID' => 2,
              'librarySectionTitle' => 'TV Shows',
              'title' => 'Old Show',
              'summary' => 'Old summary'
            }
          ]
        }
      }
    end
    let(:after_payload) do
      before_payload.deep_dup.tap do |payload|
        payload['MediaContainer']['Metadata'][0]['title'] = 'New Show'
      end
    end

    before do
      allow(http_client).to receive(:get).with('/library/metadata/88').and_return(before_payload, after_payload)
      allow(http_client).to receive(:put)
      allow(cache_store).to receive(:bump_enrich_version)
    end

    it 'uses Plex show type in update query' do
      updater.update('88', { title: 'New Show' }, media_type: 'show')
      expect(http_client).to have_received(:put).with(
        a_string_including('/library/metadata/88?', 'type=2', 'title.value=New+Show')
      )
    end
  end

  describe '#update for episodes' do
    let(:payload) do
      {
        'MediaContainer' => {
          'Metadata' => [
            {
              'librarySectionID' => 2,
              'librarySectionTitle' => 'TV Shows',
              'title' => 'Pilot'
            }
          ]
        }
      }
    end

    before do
      allow(http_client).to receive(:get).with('/library/metadata/99').and_return(payload, payload)
      allow(http_client).to receive(:put)
      allow(cache_store).to receive(:bump_enrich_version)
    end

    it 'uses Plex episode type in update query' do
      updater.update('99', { title: 'New Pilot' }, media_type: 'episode')
      expect(http_client).to have_received(:put).with(
        a_string_including('/library/metadata/99?', 'type=4', 'title.value=New+Pilot')
      )
    end
  end

  describe '#update row identity validation' do
    let(:error_class) { Plex::MediaPartPathResolver::InvalidRowIdentityError }
    let(:payload) do
      {
        'MediaContainer' => {
          'Metadata' => [
            {
              'librarySectionID' => 1,
              'librarySectionTitle' => 'Movies',
              'title' => 'Example',
              'Media' => [{ 'Part' => part_files.map { |file| { 'file' => file } } }]
            }
          ]
        }
      }
    end

    before do
      allow(http_client).to receive(:get).with('/library/metadata/42').and_return(payload)
      allow(http_client).to receive(:put)
      allow(cache_store).to receive(:bump_enrich_version)
    end

    context 'when the requested file_path does not exist on Plex metadata' do
      subject(:perform_update) do
        updater.update('42', { title: 'New Title' }, media_type: 'movie', file_path: '/movies/missing.mkv')
      end

      let(:part_files) { ['/movies/a.mkv'] }

      it 'raises a row identity error before updating Plex' do
        expect { perform_update }.to raise_error(error_class, 'Requested media row does not match Plex metadata')
      end
    end

    context 'when multipart media is updated without file_path' do
      subject(:perform_update) do
        updater.update('42', { title: 'New Title' }, media_type: 'movie')
      end

      let(:part_files) { ['/movies/a.mkv', '/movies/b.mkv'] }

      it 'raises a row identity error instead of guessing a row' do
        expect { perform_update }.to raise_error(error_class, 'Multipart media updates require a file_path')
      end
    end
  end
end
