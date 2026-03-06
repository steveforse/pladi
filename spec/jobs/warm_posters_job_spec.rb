# frozen_string_literal: true

require 'rails_helper'

RSpec.describe WarmPostersJob do
  subject(:perform_job) { described_class.perform_now(server.id, movies) }

  let(:server) { create(:plex_server) }
  let(:movies) { [{ id: '1', thumb: '/thumb-1' }, { 'id' => '2', 'thumb' => '/thumb-2' }] }
  let(:service) { instance_double(Plex::Server) }
  let(:cable_server) { instance_double(ActionCable::Server::Base) }

  before do
    allow(Plex::Server).to receive(:new).with(server).and_return(service)
    allow(ActionCable).to receive(:server).and_return(cable_server)
    allow(cable_server).to receive(:broadcast)
    allow(service).to receive(:poster_for).with('1').and_return(data: 'poster')
    allow(service).to receive(:poster_for).with('2').and_return(nil)
    perform_job
  end

  it 'broadcasts for media ids with poster data' do
    expect(cable_server).to have_received(:broadcast).with("posters_#{server.id}", { media_id: '1' })
  end

  it 'does not broadcast when poster is unavailable' do
    expect(cable_server).not_to have_received(:broadcast).with("posters_#{server.id}", { media_id: '2' })
  end
end
