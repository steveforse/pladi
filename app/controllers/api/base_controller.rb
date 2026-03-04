# frozen_string_literal: true

module Api
  class BaseController < ApplicationController
    before_action :require_authentication
    rescue_from Api::Errors::ApiError, with: :render_api_error
    rescue_from Plex::HttpClient::RequestError, with: :render_plex_error

    private

    def render_error(message, status = :unprocessable_content)
      render json: ErrorSerializer.error(message), status: status
    end

    def render_errors(messages, status = :unprocessable_content)
      render json: ErrorSerializer.errors(messages), status: status
    end

    def load_current_server!(param_key)
      @server = Current.user.plex_servers.find(params[param_key])
    rescue ActiveRecord::RecordNotFound
      raise Api::Errors::NotFound, 'Server not found'
    end

    def render_api_error(error)
      render_error(error.message, error.status)
    end

    def render_plex_error(error)
      render_error(error.message, :unprocessable_content)
    end
  end
end
