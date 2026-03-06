# frozen_string_literal: true

class MediaAuditLogRecorder
  def self.record_changes(**attributes)
    new(attributes).record_changes
  end

  def initialize(attributes)
    @attributes = attributes
    @change_set = MediaAuditLogChangeSet.new(fields:, before:, after:)
  end

  def record_changes
    change_set.entries.each do |entry|
      MediaAuditLog.create!(base_attributes.merge(entry))
    end
  end

  private

  attr_reader :attributes, :change_set

  def base_attributes
    {
      user: user,
      plex_server: plex_server,
      section_id: after[:section_id],
      section_title: after[:section_title],
      media_type: media_type,
      media_id: media_id,
      media_title: after[:media_title],
      file_path: resolved_file_path
    }
  end

  def resolved_file_path
    file_path.presence || after[:file_path].presence || before[:file_path].presence
  end

  def user = attributes.fetch(:user)
  def plex_server = attributes.fetch(:plex_server)
  def media_id = attributes.fetch(:media_id)
  def media_type = attributes.fetch(:media_type, 'movie')
  def file_path = attributes[:file_path]
  def before = attributes.fetch(:before)
  def after = attributes.fetch(:after)
  def fields = attributes.fetch(:fields)
end
