# frozen_string_literal: true

module Plex
  module MediaRowFields
    ROW_FIELD_MAP = {
      id: 'ratingKey',
      title: 'title',
      original_title: 'originalTitle',
      year: 'year',
      sort_title: 'titleSort',
      originally_available: 'originallyAvailableAt',
      studio: 'studio',
      tagline: 'tagline',
      summary: 'summary',
      content_rating: 'contentRating',
      updated_at: 'updatedAt',
      thumb: 'thumb',
      art: 'art'
    }.freeze

    FILE_FIELD_MAP = {
      file_path: 'file',
      container: 'container',
      video_codec: 'videoCodec',
      video_resolution: 'videoResolution',
      width: 'width',
      height: 'height',
      aspect_ratio: 'aspectRatio',
      frame_rate: 'videoFrameRate',
      audio_codec: 'audioCodec',
      audio_channels: 'audioChannels',
      video_bitrate: 'videoBitrate',
      overall_bitrate: 'bitrate',
      size: 'size',
      duration: 'duration'
    }.freeze

    EMPTY_FILE_ROW = {
      file_path: nil,
      container: nil,
      video_codec: nil,
      video_resolution: nil,
      width: nil,
      height: nil,
      aspect_ratio: nil,
      frame_rate: nil,
      audio_codec: nil,
      audio_channels: nil,
      video_bitrate: nil,
      overall_bitrate: nil,
      size: nil,
      duration: nil,
      subtitles: nil,
      audio_tracks: nil,
      audio_language: nil,
      audio_bitrate: nil
    }.freeze

    def self.extract(source, field_map)
      field_map.to_h { |name, key| [name, source[key]] }
    end
  end
end
