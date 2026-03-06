# frozen_string_literal: true

module Plex
  class StreamInfoSummary
    def build(part)
      {
        subtitles: subtitles_for(part),
        audio_tracks: track_count(part),
        audio_language: audio_languages(part),
        audio_bitrate: audio_bitrate(part)
      }
    end

    private

    def subtitles_for(part)
      stream_value(select_streams(part, 3)) { |stream| subtitle_label(stream) }
    end

    def track_count(part)
      audio_streams = select_streams(part, 2)
      return nil unless audio_streams.any?

      audio_streams.size.to_s
    end

    def audio_languages(part)
      stream_value(select_streams(part, 2)) { |stream| audio_language(stream) }
    end

    def audio_bitrate(part)
      select_streams(part, 2).pluck('bitrate').compact.first
    end

    def select_streams(part, stream_type)
      Array(part['Stream']).select { |stream| stream['streamType'] == stream_type }
    end

    def stream_value(streams, &)
      values = streams.filter_map(&).uniq
      values.any? ? values.join(', ') : nil
    end

    def subtitle_label(stream)
      stream['displayTitle'] || stream['language']
    end

    def audio_language(stream)
      stream['language'] || stream['languageCode']
    end
  end
end
