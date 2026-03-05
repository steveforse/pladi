# frozen_string_literal: true

module Plex
  class LibraryFetcher
    def initialize(http_client, cache_store)
      @http  = http_client
      @cache = cache_store
    end

    def fetch_sections(media_type: 'movie', view_mode: 'shows')
      fetch_sections_by_type(media_type).map do |section|
        section_id = section['key']
        updated_at = section['updatedAt']
        movies = @cache.cached_movies_for(section_id, updated_at, media_type: media_type, view_mode: view_mode) do
          items_for_section(section_id, media_type: media_type, view_mode: view_mode).sort_by { |m| m[:title].downcase }
        end
        { id: section_id, updated_at: updated_at,
          title: section['title'], movies: movies }
      end
    end

    def machine_id
      @machine_id ||= @http.get('/identity').dig('MediaContainer', 'machineIdentifier')
    end

    private

    def fetch_sections_by_type(media_type)
      payload = @http.get('/library/sections')
      (payload.dig('MediaContainer', 'Directory') || []).select { |d| d['type'] == media_type }
    end

    def plex_url_for(movie_id)
      escaped = CGI.escape("/library/metadata/#{movie_id}")
      "https://app.plex.tv/desktop/#!/server/#{machine_id}/details?key=#{escaped}"
    end

    def items_for_section(section_key, media_type:, view_mode:)
      return episodes_for_section(section_key) if media_type == 'show' && view_mode == 'episodes'
      return shows_for_section(section_key) if media_type == 'show'

      movies_for_section(section_key)
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

    def shows_for_section(section_key)
      data  = @http.get("/library/sections/#{section_key}/all")
      items = data.dig('MediaContainer', 'Metadata') || []
      items.map do |item|
        {
          id: item['ratingKey'],
          title: item['title'],
          original_title: item['originalTitle'],
          show_title: nil,
          episode_number: nil,
          year: item['year'],
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
          overall_bitrate: nil,
          size: nil,
          duration: nil,
          sort_title: item['titleSort'],
          originally_available: item['originallyAvailableAt'],
          studio: item['studio'],
          tagline: item['tagline'],
          season_count: item['childCount'],
          episode_count: item['leafCount'],
          viewed_episode_count: item['viewedLeafCount'],
          updated_at: item['updatedAt'],
          thumb: item['thumb'],
          art: item['art'],
          plex_url: plex_url_for(item['ratingKey'])
        }
      end
    end

    def episodes_for_section(section_key)
      data = @http.get("/library/sections/#{section_key}/all?type=4")
      items = data.dig('MediaContainer', 'Metadata') || []
      items.flat_map do |item|
        plex_url = plex_url_for(item['ratingKey'])
        (item['Media'] || []).flat_map do |media|
          (media['Part'] || []).map do |part|
            build_episode_hash(item, media, part, plex_url)
          end
        end
      end
    end

    def build_episode_hash(item, media, part, plex_url)
      stream_info = stream_info_for(part)
      {
        id: item['ratingKey'],
        title: item['title'],
        original_title: nil,
        show_title: item['grandparentTitle'],
        episode_number: episode_code(item),
        year: item['year'] || item['parentYear'],
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
        video_bitrate: media['videoBitrate'],
        overall_bitrate: media['bitrate'],
        size: part['size'],
        duration: media['duration'],
        sort_title: item['titleSort'],
        originally_available: item['originallyAvailableAt'],
        studio: item['studio'],
        tagline: nil,
        season_count: item['parentIndex'],
        episode_count: item['index'],
        viewed_episode_count: item['viewCount'],
        updated_at: item['updatedAt'],
        thumb: item['thumb'] || item['grandparentThumb'],
        art: item['art'] || item['grandparentArt'],
        summary: item['summary'],
        content_rating: item['contentRating'],
        collections: join_tags(item['Collection']),
        country: join_tags(item['Country']),
        directors: join_tags(item['Director']),
        genres: join_tags(item['Genre']),
        labels: join_tags(item['Label']),
        writers: join_tags(item['Writer']),
        subtitles: stream_info[:subtitles],
        audio_tracks: stream_info[:audio_tracks],
        audio_language: stream_info[:audio_language],
        audio_bitrate: stream_info[:audio_bitrate],
        video_bitrate: media['videoBitrate'],
        plex_url: plex_url
      }.merge(ratings_for(item))
    end

    def episode_code(item)
      season = item['parentIndex']
      episode = item['index']
      return nil unless season && episode

      format('S%02dE%02d', season, episode)
    end

    def stream_info_for(part)
      streams = part['Stream'] || []
      audio_streams = streams.select { |s| s['streamType'] == 2 }
      subtitle_streams = streams.select { |s| s['streamType'] == 3 }
      {
        subtitles: subtitle_streams.map { |s| s['displayTitle'] || s['language'] }.compact_blank.uniq.join(', ').presence,
        audio_tracks: audio_streams.any? ? audio_streams.size.to_s : nil,
        audio_language: audio_streams.map { |s| s['language'] || s['languageCode'] }.compact_blank.uniq.join(', ').presence,
        audio_bitrate: audio_streams.map { |s| s['bitrate'] }.compact.first
      }
    end

    def ratings_for(item)
      ratings = item['Rating'] || []
      {
        imdb_rating: rating_for(ratings, prefix: 'imdb://'),
        rt_critics_rating: rating_for(ratings, prefix: 'rottentomatoes://', type: 'critic'),
        rt_audience_rating: rating_for(ratings, prefix: 'rottentomatoes://', type: 'audience'),
        tmdb_rating: rating_for(ratings, prefix: 'themoviedb://')
      }
    end

    def rating_for(ratings, prefix:, type: nil)
      ratings.find do |rating|
        next false unless rating['image'].to_s.start_with?(prefix)
        next true if type.nil?

        rating['type'] == type
      end&.dig('value')
    end

    def join_tags(entries)
      return nil if entries.blank?

      tags = entries.map { |entry| entry['tag'] }.compact_blank.uniq
      tags.any? ? tags.join(', ') : nil
    end

    # rubocop:disable Metrics/MethodLength, Metrics/AbcSize
    def build_movie_hash(item, media, part, plex_url)
      {
        id: item['ratingKey'],
        title: item['title'],
        original_title: item['originalTitle'],
        show_title: nil,
        episode_number: nil,
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
        video_bitrate: media['videoBitrate'],
        overall_bitrate: media['bitrate'],
        size: part['size'],
        duration: media['duration'],
        sort_title: item['titleSort'],
        originally_available: item['originallyAvailableAt'],
        studio: item['studio'],
        tagline: item['tagline'],
        season_count: nil,
        episode_count: nil,
        viewed_episode_count: nil,
        updated_at: item['updatedAt'],
        thumb: item['thumb'],
        art: item['art'],
        plex_url: plex_url
      }
    end
    # rubocop:enable Metrics/MethodLength, Metrics/AbcSize
  end
end
