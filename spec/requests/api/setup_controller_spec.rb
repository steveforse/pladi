# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::SetupController do
  describe 'POST /api/setup' do
    let(:invalid_setup_params) do
      {
        user: {
          email_address: 'admin@example.com',
          password: 'password',
          password_confirmation: 'different'
        }
      }
    end

    it 'returns standardized validation errors payload' do
      post '/api/setup', params: invalid_setup_params, as: :json
      expect(response).to have_api_errors(status: :unprocessable_content)
    end
  end
end
