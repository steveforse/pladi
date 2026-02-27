class PostersChannel < ApplicationCable::Channel
  def subscribed
    server = current_user.plex_servers.find_by(id: params[:server_id])
    server ? stream_from("posters_#{params[:server_id]}") : reject
  end
end
