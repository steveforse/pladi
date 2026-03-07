# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LibraryEnrichmentChannel do
  let(:user) { create(:user) }

  before { stub_connection current_user: user }

  context 'when server belongs to current user' do
    let(:server) { create(:plex_server, user: user) }

    before { subscribe(server_id: server.id, library_type: 'movie', view_mode: 'shows') }

    it 'confirms the subscription' do
      expect(subscription).to be_confirmed
    end

    it 'streams from the scoped enrichment channel' do
      scope = Plex::MediaScope.new(library_type: 'movie', view_mode: 'shows')
      expect(subscription).to have_stream_from(LibraryEnrichmentStream.name(server.id, scope))
    end
  end

  context 'when server does not belong to current user' do
    before { subscribe(server_id: -1, library_type: 'movie', view_mode: 'shows') }

    it 'rejects the subscription' do
      expect(subscription).to be_rejected
    end
  end
end
