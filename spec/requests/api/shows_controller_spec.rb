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
        allow(service).to receive(:sections).with(media_type: 'show').and_return([{ title: 'TV Shows', movies: [{ id: '1' }] }])
        get '/api/shows', params: { server_id: server.id }, as: :json
      end

      it 'returns serialized sections payload' do
        expect(json_body).to eq([{ 'title' => 'TV Shows', 'movies' => [{ 'id' => '1' }] }])
      end
    end
  end

  describe 'GET /api/shows/:id' do
    context 'when show exists' do
      before do
        allow(service).to receive(:detail_for).with('123', media_type: 'show').and_return(summary: 'Details')
        get '/api/shows/123', params: { server_id: server.id }, as: :json
      end

      it 'returns show detail' do
        expect(json_body).to eq('summary' => 'Details')
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
        sections: [{ title: 'TV Shows', movies: [{ id: '1' }] }],
        cached_poster_ids: ['1'],
        uncached_poster_movies: [{ id: '2', thumb: '/thumb' }],
        cached_background_ids: ['1'],
        uncached_background_movies: [{ id: '2', art: '/art' }]
      )
      get '/api/shows/enrich', params: { server_id: server.id }, as: :json
    end

    it 'returns enriched payload with serialized sections and no image warming fields' do
      expect(json_body).to eq('sections' => [{ 'title' => 'TV Shows', 'movies' => [{ 'id' => '1' }] }])
    end
  end
end
