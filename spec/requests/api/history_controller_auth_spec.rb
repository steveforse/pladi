# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::HistoryController do
  it 'returns the standardized unauthenticated error for protected endpoints' do
    get '/api/history', as: :json
    expect(response).to have_api_error(status: :unauthorized, message: 'Unauthenticated')
  end
end
