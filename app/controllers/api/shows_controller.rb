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

    def update
      fields = show_params.to_h
      result = service.update_show(params[:id], fields)

      raise Api::Errors::Unprocessable, 'Plex did not persist this update' if result[:unverified_fields].any?

      log_update(result, fields)
      head :no_content
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
  end
end
