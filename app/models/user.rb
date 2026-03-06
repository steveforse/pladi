# frozen_string_literal: true

class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy
  has_many :plex_servers, dependent: :destroy
  has_many :media_audit_logs, class_name: 'MediaAuditLog', inverse_of: :user, dependent: :destroy
  has_many :movie_audit_logs, dependent: nil

  normalizes :email_address, with: ->(e) { e.strip.downcase }
end
