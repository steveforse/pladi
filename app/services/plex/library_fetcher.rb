# frozen_string_literal: true

module Plex
  class LibraryFetcher
    def initialize(http_client, cache_store)
      @http  = http_client
      @cache = cache_store
      @row_builder = LibraryRowBuilder.new
    end

    def fetch_sections(media_type: 'movie', view_mode: 'shows')
      fetch_sections_by_type(media_type).map do |section|
        section_id = section['key']
        updated_at = section['updatedAt']
        movies = @cache.cached_movies_for(section_id, updated_at, media_type: media_type, view_mode: view_mode) do
          items_for_section(section_id, media_type: media_type, view_mode: view_mode)
            .sort_by { |item| item[:title].to_s.downcase }
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
      metadata_for("/library/sections/#{section_key}/all").flat_map do |item|
        build_rows(item) do |media, part, plex_url|
          @row_builder.build_movie(item:, media:, part:, plex_url:)
        end
      end
    end

    def shows_for_section(section_key)
      metadata_for("/library/sections/#{section_key}/all").map do |item|
        @row_builder.build_show(item:, plex_url: plex_url_for(item['ratingKey']))
      end
    end

    def episodes_for_section(section_key)
      metadata_for("/library/sections/#{section_key}/all?type=4").flat_map do |item|
        build_rows(item) do |media, part, plex_url|
          @row_builder.build_episode(item:, media:, part:, plex_url:)
        end
      end
    end

    def metadata_for(path)
      @http.get(path).dig('MediaContainer', 'Metadata') || []
    end

    def build_rows(item)
      plex_url = plex_url_for(item['ratingKey'])

      Array(item['Media']).flat_map do |media|
        Array(media['Part']).map { |part| yield media, part, plex_url }
      end
    end
  end
end
