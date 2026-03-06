# frozen_string_literal: true

module Plex
  class LibraryFetcher
    def initialize(http_client, cache_store)
      @http  = http_client
      @cache = cache_store
      @row_builder = LibraryRowBuilder.new
    end

    def fetch_sections(scope: MediaScope.movies)
      fetch_sections_by_type(scope.library_type).map do |section|
        section_id = section['key']
        updated_at = section['updatedAt']
        { id: section_id, updated_at: updated_at,
          title: section['title'], items: cached_section_items(section_id, updated_at, scope) }
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

    def items_for_section(section_key, scope:)
      return episodes_for_section(section_key) if scope.episode_view?
      return shows_for_section(section_key) if scope.show_library?

      movies_for_section(section_key)
    end

    def cached_section_items(section_id, updated_at, scope)
      @cache.cached_items_for(section_id, updated_at, media_type: scope.library_type, view_mode: scope.view_mode) do
        items_for_section(section_id, scope:)
          .sort_by { |item| item[:title].to_s.downcase }
      end
    end

    def movies_for_section(section_key)
      file_rows_for_section("/library/sections/#{section_key}/all", :build_movie)
    end

    def shows_for_section(section_key)
      metadata_for("/library/sections/#{section_key}/all").map do |item|
        @row_builder.build_show(item:, plex_url: plex_url_for(item['ratingKey']))
      end
    end

    def episodes_for_section(section_key)
      file_rows_for_section("/library/sections/#{section_key}/all?type=4", :build_episode)
    end

    def metadata_for(path)
      @http.get(path).dig('MediaContainer', 'Metadata') || []
    end

    def file_rows_for_section(path, builder_method)
      metadata_for(path).flat_map do |item|
        build_rows(item) do |media, part, plex_url|
          @row_builder.public_send(builder_method, item:, media:, part:, plex_url:)
        end
      end
    end

    def build_rows(item)
      plex_url = plex_url_for(item['ratingKey'])

      Array(item['Media']).flat_map do |media|
        Array(media['Part']).map { |part| yield media, part, plex_url }
      end
    end
  end
end
