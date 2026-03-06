# frozen_string_literal: true

require 'rails_helper'

RSpec.describe WarmMediaImagesJob do
  subject(:perform_job) { described_class.perform_now(server.id, [{ id: '1' }]) }

  let(:server) { create(:plex_server) }
  let(:job) { described_class.new }

  it 'requires subclasses to implement image lookup' do
    expect { perform_job }.to raise_error(NotImplementedError, /image_for/)
  end

  it 'requires subclasses to define a cable channel' do
    expect { job.send(:channel_name, server.id) }.to raise_error(NotImplementedError, /channel_name/)
  end
end
