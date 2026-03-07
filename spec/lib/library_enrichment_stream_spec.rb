# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LibraryEnrichmentStream do
  it 'builds a scoped stream name' do
    scope = Plex::MediaScope.shows('episodes')

    expect(described_class.name(12, scope)).to eq('library_enrichment_12_show_episodes')
  end
end
