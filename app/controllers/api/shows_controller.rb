# frozen_string_literal: true

module Api
  class ShowsController < BaseController
    before_action :load_server

    def index
      render json: ::SectionSerializer.serialize(service.sections(media_type: 'show', view_mode: view_mode))
    end

    def show
      show = service.detail_for(params[:id], media_type: 'show')
      raise Api::Errors::NotFound, 'Show not found' if show.nil?

      render json: show
    end

    def refresh
      render json: ::SectionSerializer.serialize(service.sections(media_type: 'show', view_mode: view_mode, refresh: true))
    end

    def enrich
      payload = service.enriched_library(media_type: 'show', view_mode: view_mode)
      payload[:sections] = ::SectionSerializer.serialize(payload[:sections])
      payload.except!(:cached_poster_ids, :uncached_poster_movies, :cached_background_ids, :uncached_background_movies)
      render json: payload
    end

    def update
      fields = show_params.to_h
      result = service.update_show(params[:id], fields)

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

    def show_params
      params.expect(
        show: [:title, :sort_title, :summary, :tagline,
               :studio, :content_rating, :year, :originally_available,
               { genres: [], writers: [], producers: [],
                 collections: [], labels: [], country: [] }]
      )
    end

    def log_update(result, fields)
      MovieAuditLog.record_changes(
        user: Current.user,
        plex_server: @server,
        media_type: 'show',
        media_id: params[:id],
        fields: fields,
        before: result[:before],
        after: result[:after]
      )
    end

    def service
      @service ||= Plex::Server.new(@server)
    end

    def load_server
      load_current_server!(:server_id)
    end

    def view_mode
      %w[shows episodes].include?(params[:view_mode]) ? params[:view_mode] : 'shows'
    end

    def send_image(image)
      if image
        send_data image[:data], type: image[:content_type], disposition: 'inline'
      else
        head :not_found
      end
    end
  end
end
