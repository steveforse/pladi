# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::ShowsController do
  let(:user) { create(:user) }
  let(:server) { create(:plex_server, user:) }
  let(:service) { instance_double(Plex::Server) }
  let(:shows_scope) { Plex::MediaScope.shows('shows') }
  let(:episodes_scope) { Plex::MediaScope.shows('episodes') }
  let(:serialized_show_section) do
    [{
      'title' => 'TV Shows',
      'items' => [{
        'id' => '1',
        'season_count' => 2,
        'episode_count' => 20,
        'viewed_episode_count' => 8
      }]
    }]
  end

  before do
    sign_in_as(user)
    allow(Plex::Server).to receive(:new).with(server).and_return(service)
  end

  describe 'GET /api/shows' do
    context 'when server is missing' do
      it 'returns standardized not-found error' do
        get '/api/shows', params: { server_id: -1 }, as: :json
        expect(response).to have_api_error(status: :not_found, message: 'Server not found')
      end
    end

    context 'when server exists' do
      before do
        allow(service).to receive(:sections).with(scope: shows_scope).and_return(
          [{ title: 'TV Shows', items: [{ id: '1', season_count: 2, episode_count: 20, viewed_episode_count: 8 }] }]
        )
        get '/api/shows', params: { server_id: server.id }, as: :json
      end

      it { expect(json_body).to eq(serialized_show_section) }
    end
  end

  describe 'GET /api/shows/:id' do
    context 'when show exists' do
      let(:show_detail) do
        {
          'summary' => 'Details',
          'genres' => 'Drama, Thriller',
          'season_count' => 2,
          'episode_count' => 20,
          'viewed_episode_count' => 8
        }
      end

      before do
        allow(service).to receive(:detail_for).with('123', scope: shows_scope, file_path: nil)
          .and_return(show_detail.deep_symbolize_keys)
        get '/api/shows/123', params: { server_id: server.id }, as: :json
      end

      it { expect(json_body).to eq(show_detail) }
    end

    context 'when show does not exist' do
      before do
        allow(service).to receive(:detail_for).with('123', scope: shows_scope, file_path: nil).and_return(nil)
        get '/api/shows/123', params: { server_id: server.id }, as: :json
      end

      it 'returns not found error' do
        expect(response).to have_api_error(status: :not_found, message: 'Show not found')
      end
    end

    context 'when episode does not exist in episode mode' do
      before do
        allow(service).to receive(:detail_for).with('123', scope: episodes_scope, file_path: nil).and_return(nil)
        get '/api/shows/123', params: { server_id: server.id, view_mode: 'episodes' }, as: :json
      end

      it 'returns an episode-specific not found error' do
        expect(response).to have_api_error(status: :not_found, message: 'Episode not found')
      end
    end
  end

  describe 'GET /api/shows/refresh' do
    before do
      allow(service).to receive(:sections).with(scope: shows_scope,
                                                refresh: true).and_return([{
                                                                            title: 'TV Shows', items: []
                                                                          }])
      get '/api/shows/refresh', params: { server_id: server.id }, as: :json
    end

    it 'returns refreshed serialized sections' do
      expect(json_body).to eq([{ 'title' => 'TV Shows', 'items' => [] }])
    end
  end

  describe 'GET /api/shows/enrich' do
    let(:enriched_response) do
      {
        'sections' => serialized_show_section
      }
    end

    before do
      allow(service).to receive(:enriched_library).with(scope: shows_scope).and_return(
        sections: [{
          title: 'TV Shows',
          items: [{
            id: '1',
            season_count: 2,
            episode_count: 20,
            viewed_episode_count: 8
          }]
        }]
      )
      get '/api/shows/enrich', params: { server_id: server.id }, as: :json
    end

    it { expect(json_body).to eq(enriched_response) }
  end

  describe 'GET /api/shows with episode view_mode' do
    before do
      allow(service).to receive(:sections).with(scope: episodes_scope).and_return([{ title: 'TV Shows', items: [] }])

      get '/api/shows', params: { server_id: server.id, view_mode: 'episodes' }, as: :json
    end

    it { expect(response).to have_http_status(:ok) }
    it { expect(json_body).to eq([{ 'title' => 'TV Shows', 'items' => [] }]) }
  end

  describe 'PATCH /api/shows/:id' do
    let(:show_params) { { title: 'Updated Show Title' } }
    let(:update_request) do
      patch '/api/shows/123',
            params: { server_id: server.id, file_path: '/tv/show/s01e01.mkv', show: show_params },
            as: :json
    end
    let(:expected_update_call) do
      [
        '123',
        hash_including('title' => 'Updated Show Title'),
        { scope: shows_scope, file_path: '/tv/show/s01e01.mkv' }
      ]
    end
    let(:show_fields) do
      {
        original_title: 'Localized Title',
        genres: %w[Drama Sci-Fi],
        directors: ['Director 1'],
        writers: ['Writer 1'],
        producers: ['Producer 1'],
        collections: ['Favorites'],
        labels: ['Priority'],
        country: %w[US CA]
      }
    end

    it 'returns a structured error when Plex request fails' do
      allow(service).to receive(:update_media).and_raise(Plex::HttpClient::RequestError, 'Unable to reach Plex server')
      patch '/api/shows/123', params: { server_id: server.id, show: show_params }, as: :json
      expect(response).to have_api_error(status: :unprocessable_content, message: 'Unable to reach Plex server')
    end

    it 'returns unprocessable when update is not persisted' do
      allow(service).to receive(:update_media).and_return(before: {}, after: {}, unverified_fields: ['title'])
      patch '/api/shows/123', params: { server_id: server.id, show: show_params }, as: :json
      expect(response).to have_api_error(status: :unprocessable_content, message: 'Plex did not persist this update')
    end

    context 'when update succeeds' do
      before do
        allow(service).to receive(:update_media).and_return(before: {}, after: {}, unverified_fields: [])
        allow(MediaAuditLogRecorder).to receive(:record_changes)
        update_request
      end

      it { expect(response).to have_http_status(:no_content) }

      it { expect(service).to have_received(:update_media).with(*expected_update_call) }

      it do
        expect(MediaAuditLogRecorder).to have_received(:record_changes).with(
          hash_including(file_path: '/tv/show/s01e01.mkv')
        )
      end
    end

    context 'with permitted tag arrays' do
      before do
        allow(service).to receive(:update_media).and_return(before: {}, after: {}, unverified_fields: [])
        allow(MediaAuditLogRecorder).to receive(:record_changes)

        patch '/api/shows/123', params: { server_id: server.id, show: show_fields }, as: :json
      end

      it 'passes permitted tag arrays through to update_media' do
        expect(service).to have_received(:update_media)
          .with('123', hash_including(show_fields.transform_keys(&:to_s)), scope: shows_scope, file_path: nil)
      end

      it { expect(response).to have_http_status(:no_content) }
    end

    context 'when updating episode rows' do
      before do
        allow(service).to receive(:update_media).and_return(before: {}, after: { media_title: 'Pilot' },
                                                            unverified_fields: [])
        allow(MediaAuditLogRecorder).to receive(:record_changes)

        patch '/api/shows/123', params: { server_id: server.id, view_mode: 'episodes', show: show_params }, as: :json
      end

      it 'uses the episode update path' do
        expect(service).to have_received(:update_media)
          .with('123', hash_including('title' => 'Updated Show Title'), scope: episodes_scope, file_path: nil)
      end

      it 'records an episode audit log entry' do
        expect(MediaAuditLogRecorder).to have_received(:record_changes).with(hash_including(media_type: 'episode'))
      end

      it { expect(response).to have_http_status(:no_content) }
    end
  end

  describe 'GET /api/shows/:id/poster' do
    before do
      allow(service).to receive(:poster_for).with('123').and_return(data: 'img', content_type: 'image/jpeg')
      get '/api/shows/123/poster', params: { server_id: server.id }
    end

    it { expect(response).to have_http_status(:ok) }
    it { expect(response.media_type).to eq('image/jpeg') }
    it { expect(response.body).to eq('img') }
  end

  describe 'GET /api/shows/:id/background' do
    before do
      allow(service).to receive(:background_for).with('123').and_return(data: 'img-bg', content_type: 'image/png')
      get '/api/shows/123/background', params: { server_id: server.id }
    end

    it { expect(response).to have_http_status(:ok) }
    it { expect(response.media_type).to eq('image/png') }
    it { expect(response.body).to eq('img-bg') }
  end
end
