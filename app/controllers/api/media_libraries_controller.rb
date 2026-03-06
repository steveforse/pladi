# frozen_string_literal: true

module Api
  class MediaLibrariesController < BaseController
    before_action :load_server

    def index
      render_sections service.sections(scope: media_scope)
    end

    def show
      media = service.detail_for(params[:id], scope: media_scope, file_path: params[:file_path])
      raise Api::Errors::NotFound, "#{resource_name} not found" if media.nil?

      render json: media
    end

    def refresh
      render_sections service.sections(scope: media_scope, refresh: true)
    end

    def enrich
      payload = service.enriched_library(scope: media_scope)
      payload[:sections] = ::SectionSerializer.serialize(payload[:sections])
      render json: payload
    end

    def update
      fields = resource_params.to_h
      result = service.update_media(params[:id], fields, scope: media_scope)

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

    def resource_params
      params.expect(resource_param_key => Plex::MediaUpdateFields.permitted_params(extra_fields: resource_extra_fields))
    end

    def log_update(result, fields)
      MediaAuditLog.record_changes(
        user: Current.user,
        plex_server: @server,
        media_type: media_scope.update_media_type,
        media_id: params[:id],
        fields: fields,
        before: result[:before],
        after: result[:after]
      )
    end

    def render_sections(sections)
      render json: ::SectionSerializer.serialize(sections)
    end

    def send_image(image)
      return head :not_found unless image

      send_data image[:data], type: image[:content_type], disposition: 'inline'
    end

    def service
      @service ||= Plex::Server.new(@server)
    end

    def load_server
      load_current_server!(:server_id)
    end

    def resource_extra_fields
      []
    end

    def resource_param_key
      raise NotImplementedError, "#{self.class} must define #resource_param_key"
    end

    def resource_name
      media_scope.resource_name
    end
  end
end
