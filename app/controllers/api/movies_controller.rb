module Api
  class MoviesController < ApplicationController
    before_action :require_authentication
    before_action :load_server

    def index
      cache_key = "plex/server/#{@server.id}/sections"
      cached = Rails.cache.read(cache_key)
      if cached
        render json: cached
      else
        data = PlexService.new(@server).sections
        Rails.cache.write(cache_key, data, expires_in: 24.hours)
        render json: data
      end
    end

    def refresh
      cache_key = "plex/server/#{@server.id}/sections"
      data = PlexService.new(@server).sections
      Rails.cache.write(cache_key, data, expires_in: 24.hours)
      render json: data
    end

    def enrich
      service = PlexService.new(@server)
      sections = service.sections
      enriched = service.enrich_sections(sections)

      movies_with_thumbs = enriched.flat_map { |s| s[:movies] }
                                   .uniq { |m| m[:id] }
                                   .filter_map { |m| m[:thumb] && { id: m[:id], thumb: m[:thumb] } }

      cached_ids, uncached = movies_with_thumbs.partition { |m| service.poster_cached?(m[:id]) }
                               .then { |cached, rest| [cached.map { |m| m[:id] }, rest] }

      WarmPostersJob.perform_later(@server.id, uncached) if uncached.any?

      render json: { sections: enriched, cached_poster_ids: cached_ids }
    end

    def poster
      service = PlexService.new(@server)
      image = service.poster_for(params[:id])
      if image
        send_data image[:data], type: image[:content_type], disposition: "inline"
      else
        head :not_found
      end
    end

    private

    def load_server
      @server = Current.user.plex_servers.find(params[:server_id])
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Server not found" }, status: :not_found
    end
  end
end
