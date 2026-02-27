# frozen_string_literal: true

class WarmPostersJob < ApplicationJob
  queue_as :default

  def perform(server_id, movies)
    server  = PlexServer.find(server_id)
    service = PlexService.new(server)
    movies.each do |movie|
      movie = movie.with_indifferent_access
      service.warm_poster(movie[:id], movie[:thumb])
      ActionCable.server.broadcast("posters_#{server_id}", { rating_key: movie[:id] })
    end
  end
end
