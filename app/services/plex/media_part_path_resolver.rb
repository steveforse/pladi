# frozen_string_literal: true

module Plex
  class MediaPartPathResolver
    def self.resolve(item, requested_file_path: nil)
      new(item, requested_file_path:).resolve
    end

    def initialize(item, requested_file_path: nil)
      @item = item
      @requested_file_path = requested_file_path
    end

    def resolve
      return requested_file_path if requested_file_path.present? && part_file_paths.include?(requested_file_path)
      return if requested_file_path.present?
      return part_file_paths.first if part_file_paths.one?

      nil
    end

    private

    attr_reader :item, :requested_file_path

    def part_file_paths
      @part_file_paths ||= Array(item['Media']).flat_map do |media|
        Array(media['Part']).pluck('file')
      end.compact_blank
    end
  end
end
