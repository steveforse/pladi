module Api
  class MoviesController < ApplicationController
    def index
      render json: PlexService.new.sections
    end
  end
end
