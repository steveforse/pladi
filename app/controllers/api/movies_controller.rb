# frozen_string_literal: true

module Api
  class MoviesController < ApplicationController
    before_action :require_authentication
    before_action :load_server

    def index
      render json: ::SectionSerializer.serialize(service.cached_sections)
    end

    def show
      movie = service.detail_for(params[:id])
      return render json: { error: 'Movie not found' }, status: :not_found if movie.nil?

      render json: movie
    end

    def refresh
      render json: ::SectionSerializer.serialize(service.refresh_sections)
    end

    def enrich
      enriched = service.enrich_sections(service.cached_sections)
      cached_posters, uncached_posters = service.poster_cache_partition(enriched)
      cached_backgrounds, uncached_backgrounds = service.background_cache_partition(enriched)

      render json: {
        sections: ::SectionSerializer.serialize(enriched),
        cached_poster_ids: cached_posters.pluck(:id),
        uncached_poster_movies: uncached_posters,
        cached_background_ids: cached_backgrounds.pluck(:id),
        uncached_background_movies: uncached_backgrounds
      }
    end

    def warm_posters
      prioritized = prioritized_movies
      WarmPostersJob.perform_later(@server.id, prioritized) if prioritized.any?
      head :ok
    end

    def warm_backgrounds
      prioritized = prioritized_movies
      WarmBackgroundsJob.perform_later(@server.id, prioritized) if prioritized.any?
      head :ok
    end

    def update
      fields = movie_params.to_h
      result = service.update_movie(params[:id], fields)
      if result[:unverified_fields].any?
        render json: { error: 'Plex did not persist this update' }, status: :unprocessable_content
        return
      end
      log_update(result, fields)
      head :no_content
    rescue StandardError => e
      render json: { error: e.message }, status: :unprocessable_content
    end

    def poster
      send_image service.poster_for(params[:id])
    end

    def background
      send_image service.background_for(params[:id])
    end

    private

    def movie_params
      params.expect(
        movie: [:title, :original_title, :sort_title, :summary, :tagline,
                :studio, :content_rating, :edition, :year, :originally_available,
                :critic_rating, :audience_rating,
                { genres: [], directors: [], writers: [], producers: [],
                  collections: [], labels: [], country: [] }]
      )
    end

    def prioritized_movies
      priority_ids = Array(params[:priority_ids]).map(&:to_s)
      movies = Array(params[:movies]).map { |m| m.permit(:id, :thumb, :art).to_h }
      movies.sort_by { |m| priority_ids.exclude?(m[:id].to_s) }
    end

    def log_update(result, fields)
      MovieAuditLog.record_changes(
        user: Current.user,
        plex_server: @server,
        movie_id: params[:id],
        fields: fields,
        before: result[:before],
        after: result[:after]
      )
    end

    def send_image(image)
      if image
        send_data image[:data], type: image[:content_type], disposition: 'inline'
      else
        head :not_found
      end
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
