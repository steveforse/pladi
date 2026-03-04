# frozen_string_literal: true

class WarmPostersJob < ApplicationJob
  queue_as :default

  def perform(server_id, movies)
    server  = PlexServer.find(server_id)
    service = Plex::Server.new(server)
    movies.each do |movie|
      movie = movie.with_indifferent_access
      next unless service.poster_for(movie[:id])

      ActionCable.server.broadcast("posters_#{server_id}", { movie_id: movie[:id] })
    end
  end
end
