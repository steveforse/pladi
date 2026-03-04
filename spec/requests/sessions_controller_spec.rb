# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SessionsController do
  describe 'GET /session/new' do
    before { get '/session/new' }

    it 'returns ok' do
      expect(response).to have_http_status(:ok)
    end
  end

  describe 'POST /session' do
    let(:user) { create(:user, email_address: 'login@example.com', password: 'password') }

    context 'with valid credentials' do
      let(:params) { { email_address: user.email_address, password: 'password' } }

      it 'creates a session record' do
        expect { post '/session', params: params, as: :json }.to change(Session, :count).by(1)
      end

      it 'returns user email payload' do
        post '/session', params: params, as: :json
        expect(json_body).to eq('email_address' => 'login@example.com')
      end
    end

    context 'with invalid credentials' do
      before { post '/session', params: { email_address: 'login@example.com', password: 'wrong' }, as: :json }

      it 'returns unauthorized status' do
        expect(response).to have_http_status(:unauthorized)
      end

      it 'returns invalid credentials error' do
        expect(json_body).to eq('error' => 'Invalid credentials')
      end
    end

    context 'when rate limited' do
      before do
        allow(Rails.cache).to receive(:increment).and_return(11)
        post '/session', params: { email_address: 'nobody@example.com', password: 'wrong' }
      end

      it 'redirects with rate limit alert' do
        expect(flash[:alert]).to eq('Try again later.')
      end
    end
  end

  describe 'DELETE /session' do
    let(:user) { create(:user) }

    context 'when authenticated' do
      before do
        sign_in_as(user)
        delete '/session', as: :json
      end

      it 'returns ok payload' do
        expect(json_body).to eq('ok' => true)
      end

      it 'destroys current session' do
        expect(user.reload.sessions).to be_empty
      end
    end

    context 'when unauthenticated and requesting json' do
      before { delete '/session', as: :json }

      it 'returns unauthenticated error' do
        expect(response).to have_api_error(status: :unauthorized, message: 'Unauthenticated')
      end
    end

    context 'when unauthenticated and requesting html' do
      before { delete '/session' }

      it 'redirects to login' do
        expect(response).to redirect_to('/session/new')
      end
    end
  end
end
