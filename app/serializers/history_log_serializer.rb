# frozen_string_literal: true

class HistoryLogSerializer
  FIELDS = %i[
    id field_name field_type old_value new_value created_at
    media_type media_id media_title
    movie_id movie_title
    section_title
  ].freeze

  def self.serialize(logs)
    logs.map do |log|
      log.slice(*FIELDS).merge(
        plex_server: {
          id: log.plex_server.id,
          name: log.plex_server.name
        }
      )
    end
  end
end
