# frozen_string_literal: true

return unless defined?(Prosopite)

Prosopite.enabled = Rails.env.local?
Prosopite.rails_logger = true
Prosopite.raise = ENV['PROSOPITE_RAISE'] == 'true'
