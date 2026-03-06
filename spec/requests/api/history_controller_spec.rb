# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::HistoryController do
  let(:user) { create(:user) }
  let(:server) { create(:plex_server, user:, name: 'Main Server') }
  let!(:log) do
    create(
      :media_audit_log,
      user:,
      plex_server: server,
      field_name: 'summary',
      old_value: 'Old summary',
      new_value: 'New summary',
      media_type: 'movie',
      media_id: '42',
      media_title: 'The Film',
      file_path: '/movies/the-film.mkv',
      section_title: 'Cinema'
    )
  end

  before do
    sign_in_as(user)
    get '/api/history', as: :json
  end

  it 'returns serialized history rows with nested plex server details' do
    expect(json_body).to include_history_entry(log:, server_name: 'Main Server')
  end
end
