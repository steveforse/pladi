# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::MediaScope do
  describe '#hash' do
    it 'hashes library type and view mode' do
      expect(described_class.shows('episodes').hash).to eq(%w[show episodes].hash)
    end
  end
end
