# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SectionSerializer do
  describe '.serialize' do
    let(:sections) do
      [
        { id: '1', title: 'Movies', updated_at: 10, items: [{ id: 'm1' }] },
        { id: '2', title: 'TV', updated_at: 20, items: [] }
      ]
    end

    it 'returns only title and items keys' do
      expect(described_class.serialize(sections)).to eq(
        [{ title: 'Movies', items: [{ id: 'm1' }] }, { title: 'TV', items: [] }]
      )
    end
  end
end
