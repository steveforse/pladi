# frozen_string_literal: true

class WarmBackgroundsJob < ApplicationJob
  queue_as :default

  def perform(server_id, movies)
    server  = PlexServer.find(server_id)
    service = PlexService.new(server)
    movies.each do |movie|
      movie = movie.with_indifferent_access
      next unless service.warm_background(movie[:id])

      ActionCable.server.broadcast("backgrounds_#{server_id}", { movie_id: movie[:id] })
    end
  end
end
