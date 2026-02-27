# frozen_string_literal: true

module Api
  class MoviesController < ApplicationController
    before_action :require_authentication
    before_action :load_server

    def index
      render json: service.cached_sections
    end

    def refresh
      render json: service.refresh_sections
    end

    def enrich
      enriched         = service.enrich_sections(service.cached_sections)
      all_movies       = enriched.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
      poster_movies    = all_movies.filter_map { |m| { id: m[:id], thumb: m[:thumb] } if m[:thumb] }
      cached, uncached = poster_movies.partition { |m| service.poster_cached?(m[:id]) }

      WarmPostersJob.perform_later(@server.id, uncached) if uncached.any?

      render json: { sections: enriched, cached_poster_ids: cached.pluck(:id) }
    end

    def poster
      image = service.poster_for(params[:id])
      if image
        send_data image[:data], type: image[:content_type], disposition: 'inline'
      else
        head :not_found
      end
    end

    private

    def service
      @service ||= PlexService.new(@server)
    end

    def load_server
      @server = Current.user.plex_servers.find(params[:server_id])
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Server not found' }, status: :not_found
    end
  end
end
