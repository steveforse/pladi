# frozen_string_literal: true

RSpec::Matchers.define :have_api_error do |status:, message:|
  match do |response|
    response.status == Rack::Utils.status_code(status) &&
      JSON.parse(response.body) == { 'error' => message }
  end
end

RSpec::Matchers.define :have_api_errors do |status:|
  match do |response|
    body = JSON.parse(response.body)
    response.status == Rack::Utils.status_code(status) &&
      body['errors'].is_a?(Array) &&
      body['errors'].any?
  end
end

RSpec::Matchers.define :include_history_entry do |log:, server_name:|
  match do |body|
    expected = hash_including(
      'id' => log.id,
      'field_name' => log.field_name,
      'field_type' => log.field_type,
      'old_value' => log.old_value,
      'new_value' => log.new_value,
      'media_type' => log.media_type,
      'media_id' => log.media_id,
      'media_title' => log.media_title,
      'section_title' => log.section_title,
      'plex_server' => { 'id' => log.plex_server_id, 'name' => server_name }
    )
    body.any? { |entry| values_match?(expected, entry) }
  end
end
