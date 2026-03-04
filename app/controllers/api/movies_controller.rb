# frozen_string_literal: true

module Api
  class MoviesController < BaseController
    before_action :load_server

    def index
      render json: ::SectionSerializer.serialize(service.sections)
    end

    def show
      movie = service.detail_for(params[:id])
      raise Api::Errors::NotFound, 'Movie not found' if movie.nil?

      render json: movie
    end

    def refresh
      render json: ::SectionSerializer.serialize(service.sections(refresh: true))
    end

    def enrich
      payload = service.enriched_library
      payload[:sections] = ::SectionSerializer.serialize(payload[:sections])
      render json: payload
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

      raise Api::Errors::Unprocessable, 'Plex did not persist this update' if result[:unverified_fields].any?

      log_update(result, fields)
      head :no_content
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
      movies.sort_by { |m| priority_ids.include?(m[:id].to_s) ? 0 : 1 }
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
      @service ||= Plex::Server.new(@server)
    end

    def load_server
      load_current_server!(:server_id)
    end
  end
end
