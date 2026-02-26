module Api
  class MoviesController < ApplicationController
    before_action :require_authentication

    CACHE_KEY = "plex/sections"

    def index
      cached = Rails.cache.read(CACHE_KEY)
      if cached
        render json: cached
      else
        data = PlexService.new.sections
        Rails.cache.write(CACHE_KEY, data, expires_in: 24.hours)
        render json: data
      end
    end

    def refresh
      data = PlexService.new.sections
      Rails.cache.write(CACHE_KEY, data, expires_in: 24.hours)
      render json: data
    end

    def enrich
      service = PlexService.new
      sections = service.sections
      render json: service.enrich_sections(sections)
    end
  end
end
