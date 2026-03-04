# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::MoviesController do
  describe 'GET /api/movies' do
    let(:user) { create(:user) }

    before { sign_in_as(user) }

    it 'returns standardized not-found error when server is missing' do
      get '/api/movies', params: { server_id: -1 }, as: :json
      expect(response).to have_api_error(status: :not_found, message: 'Server not found')
    end
  end

  describe 'PATCH /api/movies/:id' do
    let(:user) { create(:user) }
    let(:server) { create(:plex_server, user:) }
    let(:service) { instance_double(Plex::Server) }

    before do
      sign_in_as(user)
      allow(Plex::Server).to receive(:new).with(server).and_return(service)
      allow(service).to receive(:update_movie).and_raise(Plex::HttpClient::RequestError, 'Unable to reach Plex server')
    end

    it 'returns a structured error when Plex request fails' do
      patch '/api/movies/123', params: {
        server_id: server.id,
        movie: { title: 'Updated Title' }
      }, as: :json
      expect(response).to have_api_error(status: :unprocessable_content, message: 'Unable to reach Plex server')
    end
  end
end
