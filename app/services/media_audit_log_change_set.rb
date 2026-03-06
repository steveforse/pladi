# frozen_string_literal: true

class MediaAuditLogChangeSet
  def initialize(fields:, before:, after:)
    @fields = fields
    @before = before
    @after = after
  end

  def entries
    fields.each_key.filter_map do |key|
      build_entry(key.to_s)
    end
  end

  private

  attr_reader :fields, :before, :after

  def build_entry(field_name)
    field_type, old_value, new_value = extract_change(field_name)
    return if field_type.blank? || old_value == new_value

    {
      field_name: field_name,
      field_type: field_type,
      old_value: old_value,
      new_value: new_value
    }
  end

  def extract_change(field_name)
    if Plex::MediaTagFields::UPDATE_TAG_MAP.key?(field_name)
      tag_change(field_name)
    elsif Plex::MediaUpdateFields::SCALAR_FIELD_MAP.key?(field_name)
      scalar_change(field_name)
    end
  end

  def tag_change(field_name)
    old_value = Array(before[field_name]).sort.to_json
    new_value = Array(after[field_name]).sort.to_json
    ['tag', old_value, new_value]
  end

  def scalar_change(field_name)
    ['scalar', before[field_name].to_s, after[field_name].to_s]
  end
end
