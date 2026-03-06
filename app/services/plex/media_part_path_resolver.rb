# frozen_string_literal: true

module Plex
  class MediaPartPathResolver
    class InvalidRowIdentityError < StandardError; end

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

    def error_message
      return 'Requested media row does not match Plex metadata' if invalid_requested_file_path?
      return 'Multipart media updates require a file_path' if ambiguous_without_request?

      nil
    end

    def invalid_requested_file_path?
      requested_file_path.present? && part_file_paths.exclude?(requested_file_path)
    end

    def ambiguous_without_request?
      requested_file_path.blank? && part_file_paths.many?
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
