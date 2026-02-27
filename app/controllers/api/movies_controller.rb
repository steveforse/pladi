# frozen_string_literal: true

module Api
  class MoviesController < ApplicationController
    before_action :require_authentication
    before_action :load_server

    def index
      render json: serialize_sections(service.cached_sections)
    end

    def refresh
      render json: serialize_sections(service.refresh_sections)
    end

    def enrich
      enriched = service.enrich_sections(service.cached_sections)
      cached, uncached = collect_poster_movies(enriched)

      render json: {
        sections: serialize_sections(enriched),
        cached_poster_ids: cached.map { |m| m[:id] },
        uncached_poster_movies: uncached
      }
    end

    def warm_posters
      priority_ids = Array(params[:priority_ids]).map(&:to_s)
      all_movies   = Array(params[:movies])

      prioritized = all_movies.sort_by { |m| priority_ids.include?(m[:id].to_s) ? 0 : 1 }

      WarmPostersJob.perform_later(@server.id, prioritized) if prioritized.any?

      head :ok
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

    def serialize_sections(sections)
      sections.map { |s| s.slice(:title, :movies) }
    end

    def collect_poster_movies(enriched)
      all_movies    = enriched.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
      poster_movies = all_movies.filter_map { |m| { id: m[:id], thumb: m[:thumb] } if m[:thumb] }
      poster_movies.partition { |m| service.poster_cached?(m[:id]) }
    end

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
