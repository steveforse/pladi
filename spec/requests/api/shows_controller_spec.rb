# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::ShowsController do
  let(:user) { create(:user) }
  let(:server) { create(:plex_server, user:) }
  let(:service) { instance_double(Plex::Server) }

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
        allow(service).to receive(:sections).with(media_type: 'show').and_return(
          [{
            title: 'TV Shows',
            movies: [{
              id: '1',
              season_count: 2,
              episode_count: 20,
              viewed_episode_count: 8
            }]
          }]
        )
        get '/api/shows', params: { server_id: server.id }, as: :json
      end

      it 'returns serialized sections payload' do
        expect(json_body).to eq(
          [{
            'title' => 'TV Shows',
            'movies' => [{
              'id' => '1',
              'season_count' => 2,
              'episode_count' => 20,
              'viewed_episode_count' => 8
            }]
          }]
        )
      end
    end
  end

  describe 'GET /api/shows/:id' do
    context 'when show exists' do
      before do
        allow(service).to receive(:detail_for).with('123', media_type: 'show').and_return(
          summary: 'Details',
          genres: 'Drama, Thriller',
          season_count: 2,
          episode_count: 20,
          viewed_episode_count: 8
        )
        get '/api/shows/123', params: { server_id: server.id }, as: :json
      end

      it 'returns show detail' do
        expect(json_body).to eq(
          'summary' => 'Details',
          'genres' => 'Drama, Thriller',
          'season_count' => 2,
          'episode_count' => 20,
          'viewed_episode_count' => 8
        )
      end
    end

    context 'when show does not exist' do
      before do
        allow(service).to receive(:detail_for).with('123', media_type: 'show').and_return(nil)
        get '/api/shows/123', params: { server_id: server.id }, as: :json
      end

      it 'returns not found error' do
        expect(response).to have_api_error(status: :not_found, message: 'Show not found')
      end
    end
  end

  describe 'GET /api/shows/refresh' do
    before do
      allow(service).to receive(:sections).with(media_type: 'show', refresh: true).and_return([{ title: 'TV Shows', movies: [] }])
      get '/api/shows/refresh', params: { server_id: server.id }, as: :json
    end

    it 'returns refreshed serialized sections' do
      expect(json_body).to eq([{ 'title' => 'TV Shows', 'movies' => [] }])
    end
  end

  describe 'GET /api/shows/enrich' do
    before do
      allow(service).to receive(:enriched_library).with(media_type: 'show').and_return(
        sections: [{
          title: 'TV Shows',
          movies: [{
            id: '1',
            season_count: 2,
            episode_count: 20,
            viewed_episode_count: 8
          }]
        }],
        cached_poster_ids: ['1'],
        uncached_poster_movies: [{ id: '2', thumb: '/thumb' }],
        cached_background_ids: ['1'],
        uncached_background_movies: [{ id: '2', art: '/art' }]
      )
      get '/api/shows/enrich', params: { server_id: server.id }, as: :json
    end

    it 'returns enriched payload with serialized sections and no image warming fields' do
      expect(json_body).to eq(
        'sections' => [{
          'title' => 'TV Shows',
          'movies' => [{
            'id' => '1',
            'season_count' => 2,
            'episode_count' => 20,
            'viewed_episode_count' => 8
          }]
        }]
      )
    end
  end

  describe 'PATCH /api/shows/:id' do
    let(:show_params) { { title: 'Updated Show Title' } }

    it 'returns a structured error when Plex request fails' do
      allow(service).to receive(:update_show).and_raise(Plex::HttpClient::RequestError, 'Unable to reach Plex server')
      patch '/api/shows/123', params: { server_id: server.id, show: show_params }, as: :json
      expect(response).to have_api_error(status: :unprocessable_content, message: 'Unable to reach Plex server')
    end

    it 'returns unprocessable when update is not persisted' do
      allow(service).to receive(:update_show).and_return(before: {}, after: {}, unverified_fields: ['title'])
      patch '/api/shows/123', params: { server_id: server.id, show: show_params }, as: :json
      expect(response).to have_api_error(status: :unprocessable_content, message: 'Plex did not persist this update')
    end

    it 'returns no content on successful update' do
      allow(service).to receive(:update_show).and_return(before: {}, after: {}, unverified_fields: [])
      allow(MovieAuditLog).to receive(:record_changes)
      patch '/api/shows/123', params: { server_id: server.id, show: show_params }, as: :json
      expect(response).to have_http_status(:no_content)
    end
  end
end
