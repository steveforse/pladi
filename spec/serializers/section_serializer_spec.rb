# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SectionSerializer do
  describe '.serialize' do
    let(:sections) do
      [
        { id: '1', title: 'Movies', updated_at: 10, movies: [{ id: 'm1' }] },
        { id: '2', title: 'TV', updated_at: 20, movies: [] }
      ]
    end

    it 'returns only title and movies keys' do
      expect(described_class.serialize(sections)).to eq(
        [{ title: 'Movies', movies: [{ id: 'm1' }] }, { title: 'TV', movies: [] }]
      )
    end
  end
end
