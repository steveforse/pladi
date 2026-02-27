# frozen_string_literal: true

User.find_or_create_by!(email_address: 'admin@example.com') do |u|
  u.password = 'password'
end
