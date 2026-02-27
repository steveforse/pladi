# frozen_string_literal: true

class PlexServer < ApplicationRecord
  belongs_to :user
  validates :name, :url, :token, presence: true
end
