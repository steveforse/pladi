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
      render json: service.enrich_sections(sections)
    end

    private

    def load_server
      @server = Current.user.plex_servers.find(params[:server_id])
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Server not found" }, status: :not_found
    end
  end
end
