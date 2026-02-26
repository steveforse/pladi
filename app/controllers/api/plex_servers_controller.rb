module Api
  class PlexServersController < ApplicationController
    before_action :require_authentication
    before_action :load_server, only: [:update, :destroy]

    def index
      servers = Current.user.plex_servers.select(:id, :name, :url)
      render json: servers
    end

    def lookup_name
      url   = params[:url].to_s.strip
      token = params[:token].to_s.strip
      return render json: { error: "url and token are required" }, status: :bad_request if url.blank? || token.blank?

      stub = PlexServer.new(id: 0, url: url, token: token)
      name = PlexService.new(stub).friendly_name
      render json: { name: name }
    rescue => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    def create
      server = Current.user.plex_servers.build(create_params)
      if server.save
        render json: { id: server.id, name: server.name, url: server.url }, status: :created
      else
        render json: { errors: server.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      attrs = update_params
      attrs.delete(:token) if attrs[:token].blank?
      if @server.update(attrs)
        render json: { id: @server.id, name: @server.name, url: @server.url }
      else
        render json: { errors: @server.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      @server.destroy
      head :no_content
    end

    private

    def load_server
      @server = Current.user.plex_servers.find(params[:id])
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Server not found" }, status: :not_found
    end

    def create_params
      params.require(:plex_server).permit(:name, :url, :token)
    end

    def update_params
      params.require(:plex_server).permit(:name, :url, :token)
    end
  end
end
