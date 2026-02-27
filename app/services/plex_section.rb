# frozen_string_literal: true

class PlexSection
  def initialize(http, machine_id)
    @http       = http
    @machine_id = machine_id
  end

  def movies_for(key)
    data  = @http.get("/library/sections/#{key}/all")
    items = data.dig('MediaContainer', 'Metadata') || []
    items.flat_map do |item|
      plex_url = plex_url_for(item['ratingKey'])
      (item['Media'] || []).flat_map do |media|
        (media['Part'] || []).map { |part| build_movie_hash(item, media, part, plex_url) }
      end
    end
  end

  private

  def plex_url_for(rating_key)
    escaped = CGI.escape("/library/metadata/#{rating_key}")
    "https://app.plex.tv/desktop/#!/server/#{@machine_id}/details?key=#{escaped}"
  end

  # 20-field Plex API mapping — length is inherent to the data structure.
  # rubocop:disable Metrics/MethodLength, Metrics/AbcSize
  def build_movie_hash(item, media, part, plex_url)
    {
      id: item['ratingKey'],
      title: item['title'],
      original_title: item['originalTitle'],
      year: item['year'],
      file_path: part['file'],
      container: media['container'],
      video_codec: media['videoCodec'],
      video_resolution: media['videoResolution'],
      width: media['width'],
      height: media['height'],
      aspect_ratio: media['aspectRatio'],
      frame_rate: media['videoFrameRate'],
      audio_codec: media['audioCodec'],
      audio_channels: media['audioChannels'],
      bitrate: media['bitrate'],
      size: part['size'],
      duration: media['duration'],
      updated_at: item['updatedAt'],
      thumb: item['thumb'],
      plex_url: plex_url
    }
  end
  # rubocop:enable Metrics/MethodLength, Metrics/AbcSize
end
