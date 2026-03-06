# frozen_string_literal: true

class MediaAuditLog < ApplicationRecord
  self.table_name = 'movie_audit_logs'

  belongs_to :user
  belongs_to :plex_server

  scope :recent, -> { order(created_at: :desc) }

  # rubocop:disable Metrics/ParameterLists, Metrics/MethodLength
  def self.record_changes(user:, plex_server:, media_id:, fields:, before:, after:, media_type: 'movie')
    fields.each_key do |key|
      field = key.to_s
      type, old_val, new_val = extract_change(field, before, after)
      next unless type && old_val != new_val

      create!(
        user: user, plex_server: plex_server,
        section_id: after[:section_id], section_title: after[:section_title],
        media_type: media_type, media_id: media_id, media_title: media_title_from(after),
        **legacy_movie_storage_attributes(media_id:, media_title: media_title_from(after)),
        field_name: field, field_type: type,
        old_value: old_val, new_value: new_val
      )
    end
  end
  # rubocop:enable Metrics/ParameterLists, Metrics/MethodLength

  def self.extract_change(field, before, after)
    if Plex::MediaTagFields::UPDATE_TAG_MAP.key?(field)
      old_val = (before[field] || []).sort
      new_val = (after[field] || []).sort
      ['tag', old_val.to_json, new_val.to_json]
    elsif Plex::MediaUpdateFields::SCALAR_FIELD_MAP.key?(field)
      ['scalar', before[field].to_s, after[field].to_s]
    end
  end
  private_class_method :extract_change

  def self.media_title_from(snapshot)
    snapshot[:media_title] || snapshot[:movie_title]
  end
  private_class_method :media_title_from

  def self.legacy_movie_storage_attributes(media_id:, media_title:)
    { movie_id: media_id, movie_title: media_title }
  end
  private_class_method :legacy_movie_storage_attributes
end
