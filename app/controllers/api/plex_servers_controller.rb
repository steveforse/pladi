# frozen_string_literal: true

module Api
  class PlexServersController < BaseController
    before_action :load_server, only: %i[update destroy]

    def index
      servers = Current.user.plex_servers.select(:id, :name, :url)
      render json: servers
    end

    def lookup_name
      url   = params[:url].to_s.strip
      token = params[:token].to_s.strip
      raise Api::Errors::BadRequest, 'url and token are required' if url.blank? || token.blank?

      stub = PlexServer.new(id: 0, url: url, token: token)
      name = PlexService.new(stub).friendly_name
      render json: { name: name }
    end

    def create
      server = Current.user.plex_servers.build(server_params)
      if server.save
        render json: { id: server.id, name: server.name, url: server.url }, status: :created
      else
        render_errors(server.errors.full_messages)
      end
    end

    def update
      attrs = server_params
      attrs.delete(:token) if attrs[:token].blank?
      if @server.update(attrs)
        render json: { id: @server.id, name: @server.name, url: @server.url }
      else
        render_errors(@server.errors.full_messages)
      end
    end

    def destroy
      @server.destroy
      head :no_content
    end

    private

    def load_server
      load_current_server!(:id)
    end

    def server_params
      params.expect(plex_server: %i[name url token])
    end
  end
end
