# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::PlexServersController do
  describe 'GET /api/plex_servers/lookup_name' do
    let(:user) { create(:user) }

    before { sign_in_as(user) }

    it 'returns standardized bad-request error for missing params' do
      get '/api/plex_servers/lookup_name', params: { url: 'http://127.0.0.1:32400' }, as: :json
      expect(response).to have_api_error(status: :bad_request, message: 'url and token are required')
    end

    it 'returns a structured error when Plex lookup fails' do
      stub_failing_lookup
      get '/api/plex_servers/lookup_name', params: lookup_params, as: :json
      expect(response).to have_api_error(status: :unprocessable_content, message: 'Plex returned HTTP 401')
    end

    def stub_failing_lookup
      service = instance_double(Plex::Server)
      allow(Plex::Server).to receive(:new).and_return(service)
      allow(service).to receive(:friendly_name).and_raise(Plex::HttpClient::RequestError, 'Plex returned HTTP 401')
    end

    def lookup_params
      { url: 'http://127.0.0.1:32400', token: 'bad-token' }
    end
  end
end
