# frozen_string_literal: true

class PlexSection
  def initialize(server)
    @http = PlexHttp.new(server.url, server.token)
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

  def machine_id
    @machine_id ||= @http
      .get('/identity')
      .dig('MediaContainer', 'machineIdentifier')
  end

  def plex_url_for(movie_id)
    escaped = CGI.escape("/library/metadata/#{movie_id}")
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
