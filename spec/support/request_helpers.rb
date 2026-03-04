# frozen_string_literal: true

module RequestHelpers
  def json_body
    JSON.parse(response.body)
  end

  def sign_in_as(user, password: 'password')
    post '/session', params: { email_address: user.email_address, password: password }, as: :json
    expect(response).to have_http_status(:ok)
  end
end

RSpec.configure do |config|
  config.include RequestHelpers, type: :request
end
