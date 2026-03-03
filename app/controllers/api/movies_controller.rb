# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength
module Api
  class MoviesController < ApplicationController
    before_action :require_authentication
    before_action :load_server

    def index
      render json: serialize_sections(service.cached_sections)
    end

    def show
      movie = service.detail_for(params[:id])
      return render json: { error: 'Movie not found' }, status: :not_found if movie.nil?

      render json: movie
    end

    def refresh
      render json: serialize_sections(service.refresh_sections)
    end

    def enrich
      enriched = service.enrich_sections(service.cached_sections)
      cached_posters, uncached_posters = collect_poster_movies(enriched)
      cached_backgrounds, uncached_backgrounds = collect_background_movies(enriched)

      render json: {
        sections: serialize_sections(enriched),
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

    # rubocop:disable Metrics/MethodLength, Metrics/AbcSize
    def update
      result = service.update_movie(params[:id], movie_params.to_h)
      if result[:unverified_fields].any?
        render json: { error: 'Plex did not persist this update' }, status: :unprocessable_content
        return
      end
      MovieAuditLog.record_changes(
        user: Current.user,
        plex_server: @server,
        movie_id: params[:id],
        fields: movie_params.to_h,
        before: result[:before],
        after: result[:after]
      )
      head :no_content
    rescue StandardError => e
      render json: { error: e.message }, status: :unprocessable_content
    end
    # rubocop:enable Metrics/MethodLength, Metrics/AbcSize

    def poster
      image = service.poster_for(params[:id])
      if image
        send_data image[:data], type: image[:content_type], disposition: 'inline'
      else
        head :not_found
      end
    end

    def background
      image = service.background_for(params[:id])
      if image
        send_data image[:data], type: image[:content_type], disposition: 'inline'
      else
        head :not_found
      end
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

    def serialize_sections(sections)
      sections.map { |s| s.slice(:title, :movies) }
    end

    def prioritized_movies
      priority_ids = Array(params[:priority_ids]).map(&:to_s)
      movies = Array(params[:movies]).map { |m| m.permit(:id, :thumb, :art).to_h }
      movies.sort_by { |m| priority_ids.include?(m[:id].to_s) ? 0 : 1 }
    end

    def collect_poster_movies(enriched)
      all_movies    = enriched.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
      poster_movies = all_movies.filter_map { |m| { id: m[:id], thumb: m[:thumb] } if m[:thumb] }
      cached_ids    = service.posters_cached(poster_movies.pluck(:id))
      poster_movies.partition { |m| cached_ids.include?(m[:id]) }
    end

    def collect_background_movies(enriched)
      all_movies         = enriched.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
      background_movies  = all_movies.filter_map { |m| { id: m[:id], art: m[:art] } if m[:art] }
      cached_ids         = service.backgrounds_cached(background_movies.pluck(:id))
      background_movies.partition { |m| cached_ids.include?(m[:id]) }
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
# rubocop:enable Metrics/ClassLength
