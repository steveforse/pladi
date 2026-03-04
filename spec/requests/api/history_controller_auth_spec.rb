# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::HistoryController do
  it 'returns unauthenticated json error for protected json endpoints' do
    get '/api/history', as: :json
    expect(response).to have_api_error(status: :unauthorized, message: 'Unauthenticated')
  end

  it 'redirects html requests for protected endpoints to login' do
    get '/api/history'
    expect(response).to redirect_to('/session/new')
  end
end
