# frozen_string_literal: true

module Plex
  class StreamDetailsParser
    def parse(item)
      {
        subtitles_by_file: subtitles_by_file(item),
        audio_by_file: audio_by_file(item),
        audio_language_by_file: audio_language_by_file(item),
        audio_bitrate_by_file: audio_bitrate_by_file(item),
        video_bitrate_by_file: video_bitrate_by_file(item)
      }
    end

    private

    def subtitles_by_file(item)
      each_part(item).to_h do |part|
        subtitle_str = subtitle_streams(part).map { |stream| subtitle_text(stream) }.uniq.join(', ')
        [part['file'], subtitle_str.presence]
      end
    end

    def audio_by_file(item)
      each_part(item).to_h do |part|
        audio_str = audio_streams(part).map { |stream| audio_text(stream) }.uniq.join(', ')
        [part['file'], audio_str.presence]
      end
    end

    def audio_language_by_file(item)
      each_part(item).to_h do |part|
        selected_stream = selected_audio_stream(part)
        [part['file'], selected_stream && (selected_stream['language'] || selected_stream['languageTag'])]
      end
    end

    def audio_bitrate_by_file(item)
      each_part(item).to_h do |part|
        [part['file'], selected_audio_stream(part)&.dig('bitrate')]
      end
    end

    def video_bitrate_by_file(item)
      each_part(item).to_h do |part|
        [part['file'], video_streams(part).first&.dig('bitrate')]
      end
    end

    def each_part(item)
      (item['Media'] || []).flat_map { |media| media['Part'] || [] }
    end

    def subtitle_streams(part)
      streams(part).select { |stream| stream['streamType'].to_s == '3' }
    end

    def audio_streams(part)
      streams(part).select { |stream| stream['streamType'].to_s == '2' }
    end

    def video_streams(part)
      streams(part).select { |stream| stream['streamType'].to_s == '1' }
    end

    def selected_audio_stream(part)
      audio_streams(part).find { |stream| stream['selected'] }
    end

    def streams(part)
      part['Stream'] || []
    end

    def subtitle_text(stream)
      "#{stream['displayTitle'] || stream['language'] || stream['languageTag']} (#{stream['codec']&.upcase})"
    end

    def audio_text(stream)
      language = stream['language'] || stream['languageTag']
      details = [
        stream['codec']&.upcase,
        stream['audioChannelLayout'] || (stream['channels'] && "#{stream['channels']}ch"),
        stream['bitrate'] && "#{stream['bitrate']} kbps"
      ].compact.join(', ')
      details.present? ? "#{language} (#{details})" : language
    end
  end
end
