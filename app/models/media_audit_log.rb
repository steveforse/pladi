# frozen_string_literal: true

class MediaAuditLog < ApplicationRecord
  belongs_to :user
  belongs_to :plex_server

  scope :recent, -> { order(created_at: :desc) }
end
