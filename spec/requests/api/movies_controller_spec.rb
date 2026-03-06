# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::MoviesController do
  let(:user) { create(:user) }
  let(:server) { create(:plex_server, user:) }
  let(:service) { instance_double(Plex::Server) }
  let(:movie_scope) { Plex::MediaScope.movies }

  before do
    sign_in_as(user)
    allow(Plex::Server).to receive(:new).with(server).and_return(service)
  end

  describe 'GET /api/movies' do
    context 'when server is missing' do
      it 'returns standardized not-found error' do
        get '/api/movies', params: { server_id: -1 }, as: :json
        expect(response).to have_api_error(status: :not_found, message: 'Server not found')
      end
    end

    context 'when server exists' do
      before do
        allow(service).to receive(:sections).with(scope: movie_scope)
          .and_return([{ title: 'Movies', movies: [{ id: '1' }], updated_at: 1 }])
        get '/api/movies', params: { server_id: server.id }, as: :json
      end

      it 'returns serialized sections payload' do
        expect(json_body).to eq([{ 'title' => 'Movies', 'movies' => [{ 'id' => '1' }] }])
      end
    end
  end

  describe 'GET /api/movies/:id' do
    context 'when movie exists' do
      before do
        allow(service).to receive(:detail_for).with('123', scope: movie_scope).and_return(summary: 'Details')
        get '/api/movies/123', params: { server_id: server.id }, as: :json
      end

      it 'returns movie detail' do
        expect(json_body).to eq('summary' => 'Details')
      end
    end

    context 'when movie does not exist' do
      before do
        allow(service).to receive(:detail_for).with('123', scope: movie_scope).and_return(nil)
        get '/api/movies/123', params: { server_id: server.id }, as: :json
      end

      it 'returns not found error' do
        expect(response).to have_api_error(status: :not_found, message: 'Movie not found')
      end
    end
  end

  describe 'GET /api/movies/refresh' do
    before do
      allow(service).to receive(:sections).with(scope: movie_scope, refresh: true)
        .and_return([{ title: 'Movies', movies: [] }])
      get '/api/movies/refresh', params: { server_id: server.id }, as: :json
    end

    it 'returns refreshed serialized sections' do
      expect(json_body).to eq([{ 'title' => 'Movies', 'movies' => [] }])
    end
  end

  describe 'GET /api/movies/enrich' do
    before do
      allow(service).to receive(:enriched_library).with(scope: movie_scope).and_return(
        sections: [{ title: 'Movies', movies: [{ id: '1' }] }],
        cached_poster_ids: ['1'],
        uncached_poster_movies: [],
        cached_background_ids: [],
        uncached_background_movies: []
      )
      get '/api/movies/enrich', params: { server_id: server.id }, as: :json
    end

    it 'returns enriched payload with serialized sections' do
      expect(json_body.fetch('sections')).to eq([{ 'title' => 'Movies', 'movies' => [{ 'id' => '1' }] }])
    end
  end

  describe 'POST /api/movies/warm_posters' do
    before do
      allow(WarmPostersJob).to receive(:perform_later)
      post '/api/movies/warm_posters', params: warm_params, as: :json
    end

    let(:warm_params) do
      {
        server_id: server.id,
        priority_ids: ['2'],
        movies: [{ id: '1', thumb: '/a' }, { id: '2', thumb: '/b' }]
      }
    end

    it 'enqueues prioritized poster warming' do
      expected_movies = [{ 'id' => '2', 'thumb' => '/b' }, { 'id' => '1', 'thumb' => '/a' }]
      expect(WarmPostersJob).to have_received(:perform_later).with(server.id, expected_movies)
    end

    context 'when no movies are provided' do
      let(:warm_params) { { server_id: server.id, movies: [], priority_ids: [] } }

      it 'does not enqueue job' do
        expect(WarmPostersJob).not_to have_received(:perform_later)
      end
    end
  end

  describe 'POST /api/movies/warm_backgrounds' do
    before { allow(WarmBackgroundsJob).to receive(:perform_later) }

    context 'when movies are provided' do
      before do
        post '/api/movies/warm_backgrounds', params: {
          server_id: server.id,
          priority_ids: ['2'],
          movies: [{ id: '1', art: '/a' }, { id: '2', art: '/b' }]
        }, as: :json
      end

      it 'enqueues prioritized background warming' do
        expected_movies = [{ 'id' => '2', 'art' => '/b' }, { 'id' => '1', 'art' => '/a' }]
        expect(WarmBackgroundsJob).to have_received(:perform_later).with(server.id, expected_movies)
      end
    end

    context 'when no movies are provided' do
      before do
        post '/api/movies/warm_backgrounds', params: { server_id: server.id, movies: [], priority_ids: [] }, as: :json
      end

      it 'does not enqueue job' do
        expect(WarmBackgroundsJob).not_to have_received(:perform_later)
      end
    end
  end

  describe 'PATCH /api/movies/:id' do
    let(:movie_params) { { title: 'Updated Title' } }

    it 'returns a structured error when Plex request fails' do
      allow(service).to receive(:update_movie).and_raise(Plex::HttpClient::RequestError, 'Unable to reach Plex server')
      patch '/api/movies/123', params: { server_id: server.id, movie: movie_params }, as: :json
      expect(response).to have_api_error(status: :unprocessable_content, message: 'Unable to reach Plex server')
    end

    it 'returns unprocessable when update is not persisted' do
      allow(service).to receive(:update_movie).and_return(before: {}, after: {}, unverified_fields: ['title'])
      patch '/api/movies/123', params: { server_id: server.id, movie: movie_params }, as: :json
      expect(response).to have_api_error(status: :unprocessable_content, message: 'Plex did not persist this update')
    end

    it 'returns no content on successful update' do
      allow(service).to receive(:update_movie).and_return(before: {}, after: {}, unverified_fields: [])
      allow(MovieAuditLog).to receive(:record_changes)
      patch '/api/movies/123', params: { server_id: server.id, movie: movie_params }, as: :json
      expect(response).to have_http_status(:no_content)
    end
  end

  describe 'GET /api/movies/:id/poster' do
    it 'returns image bytes when poster exists' do
      allow(service).to receive(:poster_for).with('123').and_return(data: 'img', content_type: 'image/png')
      get '/api/movies/123/poster', params: { server_id: server.id }, as: :json
      expect(response.media_type).to eq('image/png')
    end

    it 'returns not found when poster is missing' do
      allow(service).to receive(:poster_for).with('123').and_return(nil)
      get '/api/movies/123/poster', params: { server_id: server.id }, as: :json
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GET /api/movies/:id/background' do
    it 'returns image bytes when background exists' do
      allow(service).to receive(:background_for).with('123').and_return(data: 'img', content_type: 'image/jpeg')
      get '/api/movies/123/background', params: { server_id: server.id }, as: :json
      expect(response.media_type).to eq('image/jpeg')
    end

    it 'returns not found when background is missing' do
      allow(service).to receive(:background_for).with('123').and_return(nil)
      get '/api/movies/123/background', params: { server_id: server.id }, as: :json
      expect(response).to have_http_status(:not_found)
    end
  end
end
