# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::AuthController do
  describe 'GET /api/me' do
    context 'when unauthenticated' do
      before { get '/api/me', as: :json }

      it 'returns unauthorized error' do
        expect(response).to have_api_error(status: :unauthorized, message: 'Unauthenticated')
      end
    end

    context 'when authenticated' do
      let(:user) { create(:user, email_address: 'viewer@example.com', download_images: true) }

      before do
        sign_in_as(user)
        get '/api/me', as: :json
      end

      it 'returns ok' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns the email address' do
        expect(json_body.fetch('email_address')).to eq('viewer@example.com')
      end

      it 'returns the download preference' do
        expect(json_body.fetch('download_images')).to be(true)
      end
    end
  end
end
