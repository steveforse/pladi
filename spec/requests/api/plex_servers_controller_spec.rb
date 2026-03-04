# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::PlexServersController do
  let(:user) { create(:user) }

  before { sign_in_as(user) }

  describe 'GET /api/plex_servers' do
    let!(:server) { create(:plex_server, user:, name: 'Main Plex') }

    before { get '/api/plex_servers', as: :json }

    it 'returns ok status' do
      expect(response).to have_http_status(:ok)
    end

    it 'returns current user servers' do
      expect(json_body).to include(hash_including('id' => server.id, 'name' => 'Main Plex'))
    end
  end

  describe 'GET /api/plex_servers/lookup_name' do
    it 'returns standardized bad-request error for missing params' do
      get '/api/plex_servers/lookup_name', params: { url: 'http://127.0.0.1:32400' }, as: :json
      expect(response).to have_api_error(status: :bad_request, message: 'url and token are required')
    end

    it 'returns a structured error when Plex lookup fails' do
      service = instance_double(Plex::Server)
      allow(Plex::Server).to receive(:new).and_return(service)
      allow(service).to receive(:friendly_name).and_raise(Plex::HttpClient::RequestError, 'Plex returned HTTP 401')
      get '/api/plex_servers/lookup_name', params: lookup_params, as: :json
      expect(response).to have_api_error(status: :unprocessable_content, message: 'Plex returned HTTP 401')
    end

    it 'returns lookup name from Plex' do
      service = instance_double(Plex::Server)
      allow(Plex::Server).to receive(:new).and_return(service)
      allow(service).to receive(:friendly_name).and_return('Office Plex')
      get '/api/plex_servers/lookup_name', params: lookup_params, as: :json
      expect(json_body).to eq('name' => 'Office Plex')
    end

    def lookup_params
      { url: 'http://127.0.0.1:32400', token: 'good-token' }
    end
  end

  describe 'POST /api/plex_servers' do
    context 'with valid params' do
      let(:params) { { plex_server: { name: 'Office', url: 'http://plex.local', token: 'abc' } } }

      before { post '/api/plex_servers', params: params, as: :json }

      it 'returns created status' do
        expect(response).to have_http_status(:created)
      end

      it 'persists the server' do
        expect(user.plex_servers.find_by(name: 'Office')).to be_present
      end
    end

    context 'with invalid params' do
      let(:params) { { plex_server: { name: '', url: 'http://plex.local', token: 'abc' } } }

      before { post '/api/plex_servers', params: params, as: :json }

      it 'returns validation errors' do
        expect(response).to have_api_errors(status: :unprocessable_content)
      end
    end
  end

  describe 'PATCH /api/plex_servers/:id' do
    let(:server) { create(:plex_server, user:, token: 'old-token') }

    context 'when token is blank' do
      let(:params) { { plex_server: { name: 'Updated', token: '' } } }

      before { patch "/api/plex_servers/#{server.id}", params: params, as: :json }

      it 'updates name' do
        expect(server.reload.name).to eq('Updated')
      end

      it 'keeps existing token' do
        expect(server.reload.token).to eq('old-token')
      end
    end

    context 'when token is present' do
      let(:params) { { plex_server: { name: 'Updated', token: 'new-token' } } }

      before { patch "/api/plex_servers/#{server.id}", params: params, as: :json }

      it 'updates token' do
        expect(server.reload.token).to eq('new-token')
      end
    end

    context 'with invalid params' do
      let(:params) { { plex_server: { name: '', token: 'new-token' } } }

      before { patch "/api/plex_servers/#{server.id}", params: params, as: :json }

      it 'returns validation errors' do
        expect(response).to have_api_errors(status: :unprocessable_content)
      end
    end
  end

  describe 'DELETE /api/plex_servers/:id' do
    let!(:server) { create(:plex_server, user:) }

    it 'removes the server' do
      expect { delete "/api/plex_servers/#{server.id}", as: :json }.to change(PlexServer, :count).by(-1)
    end
  end
end
