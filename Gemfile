# frozen_string_literal: true

source 'https://rubygems.org'

# Bundle edge Rails instead: gem "rails", github: "rails/rails", branch: "main"
gem 'rails', '~> 8.1.2'
# The modern asset pipeline for Rails [https://github.com/rails/propshaft]
gem 'propshaft'
# Use sqlite3 as the database for Active Record
gem 'sqlite3', '>= 2.1'
# Use the Puma web server [https://github.com/puma/puma]
gem 'puma', '>= 5.0'
# Vite integration for Rails [https://vite-ruby.netlify.app/]
gem 'vite_rails'
# Build JSON APIs with ease [https://github.com/rails/jbuilder]
gem 'jbuilder'

# Use Active Model has_secure_password [https://guides.rubyonrails.org/active_model_basics.html#securepassword]
gem 'bcrypt', '~> 3.1.7'

# Plex Media Server API client
gem 'plex_ruby_sdk'

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem 'tzinfo-data', platforms: %i[windows jruby]

# Use the database-backed adapters for Rails.cache, Active Job, and Action Cable
gem 'solid_cable'
gem 'solid_cache'
gem 'solid_queue'

# Reduces boot times through caching; required in config/boot.rb
gem 'bootsnap', require: false

# Deploy this application anywhere as a Docker container [https://kamal-deploy.org]
gem 'kamal', require: false

# Add HTTP asset caching/compression and X-Sendfile acceleration to Puma [https://github.com/basecamp/thruster/]
gem 'thruster', require: false

# Use Active Storage variants [https://guides.rubyonrails.org/active_storage_overview.html#transforming-images]
gem 'image_processing', '~> 1.2'

group :development, :test do
  # See https://guides.rubyonrails.org/debugging_rails_applications.html#debugging-with-the-debug-gem
  gem 'debug', platforms: %i[mri windows], require: 'debug/prelude'

  # Audits gems for known security defects (use config/bundler-audit.yml to ignore issues)
  gem 'bundler-audit', require: false

  # Static analysis for security vulnerabilities [https://brakemanscanner.org/]
  gem 'brakeman', require: false

  # Static code analyzer and formatter for Ruby
  gem 'rubocop-rails', require: false

  # FactoryBot rubocop rules
  gem 'rubocop-factory_bot', require: false

  # Performance-focused rubocop rules
  gem 'rubocop-performance', require: false

  # RSpec rubocop rules for Rails
  gem 'rubocop-rspec_rails', require: false

  # RSpec rubocop rules [https://github.com/rubocop/rubocop-rspec]
  gem 'rubocop-rspec', require: false

  # RSpec for Rails [https://github.com/rspec/rspec-rails]
  gem 'rspec-rails'
  gem 'shoulda-matchers'

  # Factories and fake data for tests
  gem 'factory_bot_rails'
  gem 'faker'
  gem 'simplecov', require: false
  gem 'simplecov-cobertura', require: false

  # Debugging
  gem 'awesome_print'
  gem 'pry-byebug'
end

group :development do
  # Process manager for Procfile.dev [https://github.com/ddollar/foreman]
  gem 'foreman', require: false

  # Use console on exceptions pages [https://github.com/rails/web-console]
  gem 'web-console'

  # Better error pages in development [https://github.com/BetterErrors/better_errors]
  gem 'better_errors'
  gem 'binding_of_caller'
end
