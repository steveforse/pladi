# frozen_string_literal: true

module Plex
  class LibraryFetcher
    def initialize(http_client, cache_store)
      @http  = http_client
      @cache = cache_store
    end

    def fetch_sections
      fetch_movie_sections.map do |section|
        section_id = section['key']
        updated_at = section['updatedAt']
        movies = @cache.cached_movies_for(section_id, updated_at) do
          movies_for_section(section_id).sort_by { |m| m[:title].downcase }
        end
        { id: section_id, updated_at: updated_at,
          title: section['title'], movies: movies }
      end
    end

    def machine_id
      @machine_id ||= @http.get('/identity').dig('MediaContainer', 'machineIdentifier')
    end

    private

    def fetch_movie_sections
      payload = @http.get('/library/sections')
      (payload.dig('MediaContainer', 'Directory') || []).select { |d| d['type'] == 'movie' }
    end

    def plex_url_for(movie_id)
      escaped = CGI.escape("/library/metadata/#{movie_id}")
      "https://app.plex.tv/desktop/#!/server/#{machine_id}/details?key=#{escaped}"
    end

    def movies_for_section(section_key)
      data  = @http.get("/library/sections/#{section_key}/all")
      items = data.dig('MediaContainer', 'Metadata') || []
      items.flat_map do |item|
        plex_url = plex_url_for(item['ratingKey'])
        (item['Media'] || []).flat_map do |media|
          (media['Part'] || []).map { |part| build_movie_hash(item, media, part, plex_url) }
        end
      end
    end

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
        overall_bitrate: media['bitrate'],
        size: part['size'],
        duration: media['duration'],
        sort_title: item['titleSort'],
        originally_available: item['originallyAvailableAt'],
        studio: item['studio'],
        tagline: item['tagline'],
        updated_at: item['updatedAt'],
        thumb: item['thumb'],
        art: item['art'],
        plex_url: plex_url
      }
    end
    # rubocop:enable Metrics/MethodLength, Metrics/AbcSize
  end
end
