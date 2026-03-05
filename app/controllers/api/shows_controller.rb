# frozen_string_literal: true

module Api
  class ShowsController < BaseController
    before_action :load_server

    def index
      render json: ::SectionSerializer.serialize(service.sections(media_type: 'show'))
    end

    def show
      show = service.detail_for(params[:id], media_type: 'show')
      raise Api::Errors::NotFound, 'Show not found' if show.nil?

      render json: show
    end

    def refresh
      render json: ::SectionSerializer.serialize(service.sections(media_type: 'show', refresh: true))
    end

    def enrich
      payload = service.enriched_library(media_type: 'show')
      payload[:sections] = ::SectionSerializer.serialize(payload[:sections])
      payload.except!(:cached_poster_ids, :uncached_poster_movies, :cached_background_ids, :uncached_background_movies)
      render json: payload
    end

    private

    def service
      @service ||= Plex::Server.new(@server)
    end

    def load_server
      load_current_server!(:server_id)
    end
  end
end
