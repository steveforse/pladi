# frozen_string_literal: true

FactoryBot.define do
  factory :media_audit_log, aliases: [:movie_audit_log] do
    user
    plex_server
    section_id { '1' }
    section_title { 'Movies' }
    media_type { 'movie' }
    media_id { '100' }
    media_title { 'Example Movie' }
    movie_id { '100' }
    movie_title { 'Example Movie' }
    field_name { 'title' }
    field_type { 'scalar' }
    old_value { 'Old Title' }
    new_value { 'New Title' }
  end
end
