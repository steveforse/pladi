module Api
  class MoviesController < ApplicationController
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
  end
end
