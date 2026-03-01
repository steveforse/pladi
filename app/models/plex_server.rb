# frozen_string_literal: true

class PlexServer < ApplicationRecord
  belongs_to :user
  has_many :movie_audit_logs, dependent: :destroy
  validates :name, :url, :token, presence: true
end
