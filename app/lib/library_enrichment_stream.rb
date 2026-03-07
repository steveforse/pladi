# frozen_string_literal: true

class LibraryEnrichmentStream
  def self.name(server_id, scope)
    "library_enrichment_#{server_id}_#{scope.library_type}_#{scope.view_mode}"
  end
end
