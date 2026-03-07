# frozen_string_literal: true

require 'rails_helper'

RSpec.describe WarmLibraryEnrichmentJob do
  subject(:perform_job) { described_class.perform_now(server.id, scope.to_h, section_ids) }

  let(:server) { create(:plex_server) }
  let(:scope) { Plex::MediaScope.movies }
  let(:section_ids) { ['1'] }
  let(:service) { instance_double(Plex::Server) }
  let(:cable_server) { instance_double(ActionCable::Server::Base, broadcast: nil) }
  let(:section) { { id: '1', title: 'Movies', items: [{ id: 'm1' }] } }

  before do
    allow(Plex::Server).to receive(:new).with(server).and_return(service)
    allow(ActionCable).to receive(:server).and_return(cable_server)
    allow(service).to receive(:sections).with(scope:).and_return([section, { id: '2', title: 'Skip', items: [] }])
  end

  # rubocop:disable RSpec/ExampleLength, RSpec/MultipleExpectations
  it 'broadcasts progress and completion for pending sections only' do
    allow(service).to receive(:stream_enrich_section).with(section, scope:).and_yield([{ id: 'm1', title: 'Movie 1' }])

    perform_job

    expect(cable_server).to have_received(:broadcast).with(
      LibraryEnrichmentStream.name(server.id, scope),
      { state: 'progress', section_id: '1', section_title: 'Movies', items: [{ id: 'm1', title: 'Movie 1' }] }
    )
    expect(cable_server).to have_received(:broadcast).with(
      LibraryEnrichmentStream.name(server.id, scope),
      { state: 'completed', section_id: '1' }
    )
    expect(service).to have_received(:stream_enrich_section).once
  end
  # rubocop:enable RSpec/ExampleLength, RSpec/MultipleExpectations

  # rubocop:disable RSpec/ExampleLength, RSpec/MultipleExpectations
  it 'broadcasts failure and logs when enrichment raises' do
    allow(service).to receive(:stream_enrich_section).with(section, scope:).and_raise(StandardError, 'boom')
    allow(Rails.logger).to receive(:warn)

    perform_job

    expect(cable_server).to have_received(:broadcast).with(
      LibraryEnrichmentStream.name(server.id, scope),
      { state: 'failed', section_id: '1' }
    )
    expect(Rails.logger).to have_received(:warn)
      .with("WarmLibraryEnrichmentJob failed for server=#{server.id} section=1")
  end
  # rubocop:enable RSpec/ExampleLength, RSpec/MultipleExpectations
end
