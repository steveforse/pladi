# frozen_string_literal: true

class BackgroundsChannel < ApplicationCable::Channel
  def subscribed
    server = current_user.plex_servers.find_by(id: params[:server_id])
    server ? stream_from("backgrounds_#{params[:server_id]}") : reject
  end
end
