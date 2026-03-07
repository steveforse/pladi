# frozen_string_literal: true

class LibraryEnrichmentChannel < ApplicationCable::Channel
  def subscribed
    server = current_user.plex_servers.find_by(id: params[:server_id])
    return reject unless server

    scope = Plex::MediaScope.new(
      library_type: params[:library_type].to_s,
      view_mode: params[:view_mode].presence
    )
    stream_from(LibraryEnrichmentStream.name(server.id, scope))
  end
end
