# frozen_string_literal: true

require 'rails_helper'

RSpec.describe WarmMediaImagesJob do
  subject(:perform_job) { described_class.perform_now(server.id, [{ id: '1' }]) }

  let(:server) { create(:plex_server) }

  it 'requires subclasses to implement image lookup' do
    expect { perform_job }.to raise_error(NotImplementedError, /image_for/)
  end
end
