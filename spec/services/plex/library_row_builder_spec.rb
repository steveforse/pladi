# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::LibraryRowBuilder do
  subject(:builder) { described_class.new }

  describe '#build_episode' do
    let(:item) do
      {
        'ratingKey' => '1',
        'title' => 'Pilot',
        'grandparentTitle' => 'Show',
        'index' => 1
      }
    end
    let(:media) { { 'Part' => [] } }
    let(:part) { { 'file' => '/tv/show/pilot.mkv' } }

    it 'returns nil episode_number when season data is missing' do
      row = builder.build_episode(item:, media:, part:, plex_url: 'plex://show/1')
      expect(row[:episode_number]).to be_nil
    end
  end
end
