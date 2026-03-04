# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::SetupController do
  describe 'GET /api/setup' do
    context 'when no users exist' do
      before { get '/api/setup', as: :json }

      it 'reports setup is needed' do
        expect(json_body).to eq('needed' => true)
      end
    end

    context 'when a user exists' do
      before do
        create(:user)
        get '/api/setup', as: :json
      end

      it 'reports setup is not needed' do
        expect(json_body).to eq('needed' => false)
      end
    end
  end

  describe 'POST /api/setup' do
    let(:valid_params) do
      {
        user: {
          email_address: 'admin@example.com',
          password: 'password',
          password_confirmation: 'password'
        }
      }
    end

    it 'creates the first user' do
      expect { post '/api/setup', params: valid_params, as: :json }.to change(User, :count).by(1)
    end

    it 'starts an authenticated session for the new user' do
      expect { post '/api/setup', params: valid_params, as: :json }.to change(Session, :count).by(1)
    end

    it 'returns created user payload' do
      post '/api/setup', params: valid_params, as: :json
      expect(json_body).to eq('email_address' => 'admin@example.com')
    end

    context 'when setup was already completed' do
      before do
        create(:user)
        post '/api/setup', params: valid_params, as: :json
      end

      it 'returns forbidden error' do
        expect(response).to have_api_error(status: :forbidden, message: 'Setup already completed')
      end
    end

    context 'with invalid params' do
      let(:invalid_params) do
        {
          user: {
            email_address: 'admin@example.com',
            password: 'password',
            password_confirmation: 'different'
          }
        }
      end

      before { post '/api/setup', params: invalid_params, as: :json }

      it 'returns standardized validation errors payload' do
        expect(response).to have_api_errors(status: :unprocessable_content)
      end
    end
  end
end
