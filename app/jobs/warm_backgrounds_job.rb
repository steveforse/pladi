# frozen_string_literal: true

class WarmBackgroundsJob < ApplicationJob
  queue_as :default

  def perform(server_id, movies)
    server  = PlexServer.find(server_id)
    service = Plex::Server.new(server)
    movies.each do |movie|
      movie = movie.with_indifferent_access
      next unless service.background_for(movie[:id])

      ActionCable.server.broadcast("backgrounds_#{server_id}", { movie_id: movie[:id] })
    end
  end
end
