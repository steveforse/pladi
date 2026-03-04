# frozen_string_literal: true

require 'rails_helper'

RSpec.describe BackgroundsChannel do
  let(:user) { create(:user) }

  before { stub_connection current_user: user }

  context 'when server belongs to current user' do
    let(:server) { create(:plex_server, user: user) }

    before { subscribe(server_id: server.id) }

    it 'confirms subscription' do
      expect(subscription).to be_confirmed
    end

    it 'streams from server backgrounds channel' do
      expect(subscription).to have_stream_from("backgrounds_#{server.id}")
    end
  end

  context 'when server does not belong to current user' do
    before { subscribe(server_id: -1) }

    it 'rejects the subscription' do
      expect(subscription).to be_rejected
    end
  end
end
