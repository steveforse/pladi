# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::StreamInfoSummary do
  subject(:summary) { described_class.new }

  describe '#build' do
    it 'returns nil track count when there are no audio streams' do
      result = summary.build('Stream' => [{ 'streamType' => 3, 'language' => 'English' }])
      expect(result[:audio_tracks]).to be_nil
    end

    it 'returns nil audio language when streams have no language fields' do
      result = summary.build('Stream' => [{ 'streamType' => 2, 'bitrate' => 320 }])
      expect(result[:audio_language]).to be_nil
    end
  end
end
