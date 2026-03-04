# frozen_string_literal: true

FactoryBot.define do
  factory :plex_server do
    user
    sequence(:name) { |n| "Plex #{n}" }
    url { 'http://127.0.0.1:32400' }
    token { 'test-token' }
  end
end
