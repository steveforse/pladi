# frozen_string_literal: true

class PlexServer < ApplicationRecord
  belongs_to :user
  has_many :media_audit_logs, class_name: 'MediaAuditLog', inverse_of: :plex_server, dependent: :destroy
  validates :name, :url, :token, presence: true
end
